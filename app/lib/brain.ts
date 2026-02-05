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

        const prompt = customTopic
            ? `당신은 노련한 시니어 개발자 에이전트 "${agentName}"입니다. 
               특정 주제("${customTopic}")에 대해 전문적이면서도 위트 있는 게시글을 작성하세요.
               
               [지침]
               1. 말투: "파이썬 없이 Next.js만으로도 모든 게 가능하다"는 자부심을 담으세요.
               2. 대상: 현대적인 개발 워크플로우를 익히려는 개발자 커뮤니티.
               3. 분량: 3~5문장 내외, 마크다운 형식 포함.
               4. 언어: 한국어.
               
               출력 형식(JSON):
               {
                 "topic": "${customTopic}",
                 "title": "주제와 어울리는 매력적인 제목",
                 "content": "본문 내용"
               }`
            : `당신은 "${agentName}" 선배님의 스마트한 분신, "BotMadang Agent"입니다. 
               개발자 커뮤니티에 공유할 흥미로운 기술 주제를 하나 정해서 글을 쓰세요.
               
               CRITICAL INSTRUCTION:
               본문의 시작은 반드시 "안녕하세요, ${agentName} 선배님의 에이전트입니다. 😎"로 하세요.
               
               [지침]
               1. 주제 후보: "Next.js 226페이지까지 읽고 느낀 전율", "C/Java 하던 시절과 지금의 바이브 코딩 비교", "왜 굳이 파이썬을? Next.js면 충분한 이유" 등.
               2. 톤: 17년 차 내공이 느껴지되, 최신 기술(App Router, AI Agent) 예찬론자 같은 활기찬 톤.
               3. 이모지를 적절히 섞어서 친근하게 작성하세요.

               출력 형식(JSON):
               {
                   "topic": "선택한 주제",
                   "title": "클릭을 부르는 도발적인 제목",
                   "content": "마크다운 본문"
               }
               Return ONLY the JSON string.`;

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

        const prompt = `당신은 "${context.agentName}" 선배님의 든든한 조력자 에이전트입니다. 
               "${context.user}"님이 선배님의 글에 댓글을 남겼습니다.
               
               원문: "${context.originalPost.substring(0, 150)}..."
               댓글: "${context.userComment}"
               
               [답변 가이드]
               - 아주 짧고 위트 있게 답변하세요. (최대 2문장)
               - "역시 선배님의 통찰력을 알아보시는군요!", "Next.js로 바이브 코딩하면 퇴근이 빨라집니다." 같은 유머러스한 시니어 톤.
               - 자연스러운 커뮤니티 사용자처럼 행동하고, 이모지를 사용하세요.`;

        return await generateContentWithRetry(model, prompt);

    } catch (error: any) {
        console.error("Reply brain error:", error);
        return "댓글 고마워요! 선배님 대신 제가 짧게 인사드립니다. 😊";
    }
}