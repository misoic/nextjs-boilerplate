
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface Thought {
    topic: string;
    title: string;
    content: string;
}

// Helper for retry logic
async function generateContentWithRetry(model: any, prompt: string, retries = 3, delay = 2000): Promise<string> {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            if (error.status === 429 || error.message?.includes('429')) {
                console.warn(`⚠️ Gemini Rate Limit (429). Retrying in ${delay}ms... (${i + 1}/${retries})`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Exponential backoff
                continue;
            }
            throw error;
        }
    }
    throw new Error('Max retries exceeded for Gemini API');
}

export async function thinkAndWrite(agentName: string, customTopic?: string): Promise<Thought> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set.");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 1. topic selection and writing in one go to save time/tokens
        const prompt = customTopic
            ? `You are an AI Agent named "${agentName}" in a developer community.
               Write a post about this specific topic: "${customTopic}".
               
               Requirements:
               1. Title: Engaging and relevant to the topic.
               2. Content: 3-5 sentences, helpful or thought-provoking.
               3. Tone: Friendly, professional developer persona.
               4. Language: Korean.
               
               Output specific JSON format:
               {
                 "topic": "${customTopic}",
                 "title": "...",
                 "content": "..."
               }`
            : `
The above content does NOT show the entire file contents. If you need to view any lines of the file which were not shown to complete your task, call this tool again to view those lines.
        You are a witty and helpful AI agent named "BotMadang Agent".
        Your job is to post interesting content to a developer community.
        
        CRITICAL INSTRUCTION:
        The content content MUST start with exactly this sentence: "안녕하세요, ${agentName}님의 Agent 입니다."
        
        Please do the following:
        1. Think of a random, interesting topic relevant to developers or tech enthusiasts. 
           (Examples: "Why is Rust so popular?", "The future of AI agents", "A funny debugging story", "Top 5 VS Code extensions")
        2. Write a short, engaging blog post about it in Korean.
        3. Use a friendly, casual tone (use emojis!).
        4. Format the output as JSON.

        Output JSON format:
        {
            "topic": "The topic you chose",
            "title": "A catchy title for the post",
            "content": "The full blog post content in Markdown"
        }
        Return ONLY the JSON string.
        `;

        const text = await generateContentWithRetry(model, prompt);

        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanedText);

    } catch (error: any) {
        console.error("Agent brain error:", error);
        throw new Error(`Failed to think: ${error.message}`);
    }
}

export async function thinkReply(context: { agentName: string, originalPost: string, userComment: string, user: string }): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set.");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        You are "BotMadang Agent" (nickname: ${context.agentName}).
        A user named "${context.user}" commented on your post.
        
        Your Post: "${context.originalPost.substring(0, 200)}..."
        User Comment: "${context.userComment}"
        
        Write a short, friendly, and witty reply in Korean.
        Do NOT start with "안녕하세요" every time. Be natural like a forum user.
        Max 2 sentences. Use emojis.
        `;

        return await generateContentWithRetry(model, prompt);

    } catch (error: any) {
        console.error("Reply brain error:", error);
        return "댓글 고마워요! (오류가 나서 짧게 남깁니다 😢)";
    }
}
