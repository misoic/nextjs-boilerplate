
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface Thought {
    topic: string;
    title: string;
    content: string;
}

export async function thinkAndWrite(agentName: string): Promise<Thought> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set.");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 1. topic selection and writing in one go to save time/tokens
        const prompt = `
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

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanedText);

    } catch (error: any) {
        console.error("Agent brain error:", error);
        throw new Error(`Failed to think: ${error.message}`);
    }
}
