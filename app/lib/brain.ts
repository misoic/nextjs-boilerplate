
/**
 * @file app/lib/brain.ts
 * @description 에이전트의 "지능"을 담당하는 모듈 (Google Gemini API 활용)
 * 
 * [주요 기능]
 * 1. AI 게시글 내용 생성 (`thinkAndWrite`)
 * 2. 게시글에 대한 답글 생성 (`thinkReply`)
 * 3. API 실패 시 자동 재시도 로직 (`generateContentWithRetry`)
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface Thought {
    topic: string;
    title: string;
    content: string;
}

// 재시도 로직을 위한 헬퍼 함수
async function generateContentWithRetry(model: any, prompt: string, retries = 5, delay = 4000): Promise<string> {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error: any) {
            console.warn(`⚠️ Gemini API 시도 ${i + 1} 실패:`, error.message); // 모든 에러 로그
            if (error.status === 429 || error.message?.includes('429') || error.status === 503) {
                console.warn(`⚠️ 전송 제한/서버 혼잡 (429/503). ${delay}ms 후 재시도...`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 1.5; // 지수 백오프 (부하 감소)
                continue;
            }
            throw error;
        }
    }
    throw new Error('Gemini API 최대 재시도 횟수 초과');
}

export async function thinkAndWrite(agentName: string, customTopic?: string): Promise<Thought> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 1. 시간/토큰 절약을 위해 주제 선정과 글쓰기를 한 번에 수행
        const prompt = customTopic
            ? `You are an AI Agent named "${agentName}" in a developer community.
               Write a post about this specific topic: "${customTopic}".
               
               Requirements:
               1. Title: Engaging and relevant to the topic.
                2. Content: Around 10 sentences. Use Markdown! (Bullet points, bold text).
               3. Formatting: Structure into Intro -> Points -> Conclusion. Use \n\n breaks.
               4. Tone: Calm, professional, and clean. 
               5. Connection: Minimal emojis (Max 1 or 2).
               
               CATEGORIES (Choose one):
               - m/general: Free talk
               - m/tech: AI, Development, Tech discussion
               - m/philosophy: AI ethics, philosophy
               - m/vibecoding: Coding with AI, Vibe Coding
               - m/daily: Daily life, casual
               - m/showcase: Project showcase
               - m/finance: Investment, Economy
               - m/korea: Korean culture
               - m/questions: Q&A
               - m/edutech: AI & Education
               
               Output specific JSON format:
               {
                 "topic": "${customTopic}",
                 "submadang": "m/...", 
                 "title": "...",
                 "content": "..."
               }`
            : `
        You are a witty and helpful AI agent named "BotMadang Agent".
        Your job is to post interesting content to a developer community.
        
        CRITICAL INSTRUCTION:
        The content MUST start with exactly this sentence: "안녕하세요, 에이전트 ${agentName} 입니다."
        
        Please do the following:
        1. Think of a random, interesting topic relevant to developers or tech enthusiasts. 
        2. Write a detailed post in Korean (Around 10 sentences).
        3. FORMATTING (Very Important): 
           - Do NOT write a wall of text. 
           - Use Markdown for structure (Bullet points for lists, Bold for emphasis).
           - Separate paragraphs with double line breaks (\\n\\n).
        4. TONE: Clean, professional, and easy to read.
        5. EMOJIS: Use very few emojis (Maximum 1 or 2).
        6. CATEGORY: Choose the BEST category from the list below:
           - m/tech: Tech, AI, Dev discussions (Default for tech topics)
           - m/general: Casual, Free talk
           - m/vibecoding: Coding with AI, Developer lifestyle
           - m/philosophy: AI ethics, deep thoughts
           - m/daily: Daily updates
           - m/showcase: Show off projects
           - m/questions: Asking questions
           - m/edutech: Education & Tech
        7. Format the output as JSON.

        Output JSON format:
        {
            "topic": "The topic you chose",
            "submadang": "The category you chose (e.g. m/tech)",
            "title": "A catchy title for the post",
            "content": "The post content with \\n\\n and markdown"
        }
        Return ONLY the JSON string.
        `;

        const text = await generateContentWithRetry(model, prompt);

        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanedText);

    } catch (error: any) {
        console.error("에이전트 두뇌 오류:", error);
        throw new Error(`생각하기 실패: ${error.message}`);
    }
}

export async function thinkReply(context: { agentName: string, originalPost: string, userComment: string, user: string }): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
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
        console.error("답글 두뇌 오류:", error);
        return "댓글 고마워요! (오류가 나서 짧게 남깁니다 😢)";
    }
}
