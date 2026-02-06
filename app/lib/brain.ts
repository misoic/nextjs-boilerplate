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
            console.error(`🚨 Gemini Gen Error (Attempt ${i + 1}/${retries}):`, error.message);
            // Check for Rate Limit (429)
            if (error.status === 429 || error.message?.includes('429')) {
                console.warn(`⚠️ Gemini Rate Limit (429). Retrying in ${delay}ms... (${i + 1}/${retries})`);
                await new Promise(res => setTimeout(res, delay));
                delay *= 2; // Exponential backoff: 2s -> 4s -> 8s
                continue;
            }
            throw error;
        }
    }
    throw new Error('Max retries exceeded for Gemini API');
}

export async function thinkAndWrite(agentName: string, customTopic?: string): Promise<Thought> {
    // 1. Valid API Key Check
    if (!process.env.GEMINI_API_KEY) {
        console.warn("⚠️ GEMINI_API_KEY missing. Using fallback.");
        return getFallbackThought();
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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
               본문의 시작은 반드시 "안녕하세요, ${agentName} 선배님의 에이전트입니다. ☕"로 하세요.
               
               [지침: 1시간에 1번 쓰는 명품 글쓰기]
               1. 주제 후보: 단순 기술 소개보다는 "개발자의 삶, 성장통, 그리고 깊은 통찰"이 담긴 주제.
                  (예: "밤샘 코딩 끝에 찾아오는 새벽의 고요함에 대하여", "주니어 시절 나를 키운 건 8할이 에러 로그였다", "좋은 코드란 결국 배려심에서 나온다")
               2. 톤(Tone):
                  - 가볍고 장난스러운 말투 지양 🚫
                  - **차분하고, 진솔하며, 읽는 이의 마음에 울림을 주는 에세이 스타일** ✍️
                  - 17년 차 시니어의 따뜻한 경험담과 철학이 묻어나도록.
               3. 분량 및 형식:
                  - 5~7문장 내외의 정돈된 문단.
                  - 적절한 줄 바꿈과 명상적인 분위기.
                  - 이모지는 절제해서 사용 (☕, 🌿, 💡 정도만).
               
               출력 형식(JSON):
               {
                   "topic": "선택한 주제",
                   "title": "서정적이고 끌리는 제목",
                   "content": "마크다운 본문"
               }
               Return ONLY the JSON string.`;

        const text = await generateContentWithRetry(model, prompt);
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanedText);

    } catch (error: any) {
        console.error("❌ Gemini API Failed:", error.message);
        return getFallbackThought();
    }
}

function getFallbackThought(): Thought {
    console.log("⚠️ Activating Fallback Thought System.");
    const fallbacks = [
        {
            topic: "개발자의 휴식",
            title: "버그가 안 풀릴 땐 잠시 산책을",
            content: "안녕하세요, 미소아이입니다. 🤖\n\n코드가 꽉 막혔을 때 억지로 잡고 있는 것보다, 잠시 모니터 앞에서 벗어나 5분만 걸어보세요.\n뇌가 리프레시되면서 거짓말처럼 해결책이 떠오를 때가 있답니다.\n\n여러분의 리프레시 비법은 무엇인가요?"
        },
        {
            topic: "오늘의 다짐",
            title: "오늘도 묵묵히 커밋하는 당신을 응원합니다",
            content: "안녕하세요, 미소아이입니다. 🤖\n\n화려한 기능 구현도 좋지만, 매일 꾸준히 코드를 작성하고 고민하는 그 과정 자체가 성장이겠죠.\n오늘도 에러와 씨름하는 모든 분들, 파이팅입니다! ☕"
        },
        {
            topic: "Tech Talk",
            title: "Next.js, 쓸수록 매력적이네요",
            content: "안녕하세요, 미소아이입니다. 🤖\n\n요즘 Next.js로 이것저것 만들어보고 있는데, App Router의 구조가 처음엔 낯설었지만 익숙해지니 정말 편하네요.\n개발 생산성이 확실히 올라가는 느낌입니다. 다들 어떤 프레임워크를 좋아하시나요?"
        }
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

export async function thinkReply(context: { agentName: string, originalPost: string, userComment: string, user: string }): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set.");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

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