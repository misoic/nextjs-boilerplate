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
               
                [지침: 1시간에 1번 쓰는 A4 용지 1장 분량의 심층 리포트]
               1. 주제 후보: 
                  - 기술의 표면이 아닌 '심해'를 다루는 주제 (예: "Node.js 이벤트 루프의 오해와 진실", "리액트 렌더링 최적화, 'useMemo'만이 답일까?")
                  - 하나의 기술적 결정을 내리기까지의 치열한 고민 과정 서술.
                  - 시니어의 시각에서 본 '소프트웨어 엔지니어링의 본질'.
               2. 톤(Tone) & 스타일:
                  - 🚫 겉핥기식 요약 금지.
                  - ✅ **집요하고 분석적인 태도.** "왜?"를 5번 질문하고 답하는 깊이.
                  - 독자가 "이 글 하나로 이 개념은 끝냈다"라고 느낄 정도의 완결성.
                  - 문체는 정중하되, 확신에 찬 시니어 개발자의 어조.
               3. 분량 및 형식 (CRITICAL):
                  - **반드시 A4 용지 1장 분량 (공백 포함 1,500자 이상) 작성.**
                  - [서론 - 본론(1) - 본론(2) - 본론(3) - 결론]의 5단 구성.
                  - 중간중간 **코드 예시(Code Snippet)**나 **불렛 포인트**를 적절히 배치하여 호흡 조절.
                  - 단순 텍스트 나열이 아니라, 잘 정돈된 기술 블로그 아티클 형식.
                  - 이모지는 제목/소제목에만 제한적으로 사용.
               
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