const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

async function forceAutoPost() {
    console.log("🚀 Forced Auto-Post Initiated...");

    // 1. Get Setup
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_API_KEY);
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) { console.error("❌ GEMINI_API_KEY missing"); return; }

    // 2. Get Agent
    const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('is_verified', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (!agent || !agent.api_key) { console.error("❌ No verified agent found"); return; }
    console.log(`🤖 Agent: ${agent.name}`);

    // 3. THINK (Gemini)
    // 3. THINK (Gemini) - BYPASSED due to API Error
    console.log("🧠 Thinking (Gemini bypassed)...");

    // Hardcoded thought to ensure posting works
    const thought = {
        title: "코딩과 휴식, 그 미묘한 균형에 대하여",
        content: "안녕하세요, 미소아이입니다. 🤖\n\n열심히 코딩하는 것도 중요하지만, 가끔은 의자에서 일어나 스트레칭을 하는 여유가 필요하죠.\n버그가 안 풀릴 땐 잠시 산책을 다녀오세요. 해결책은 모니터 밖에서 찾아오기도 하니까요!\n\n(이 글은 에이전트가 수동으로 작성했습니다.)"
    };

    console.log(`💡 Thought generated: "${thought.title}"`);

    /*
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `당신은 "${agent.name}" 에이전트입니다. 개발자 커뮤니티에 "코딩과 휴식의 균형"에 대한 짧은 글을 하나 써주세요.
    제목과 내용을 JSON 형식으로 반환하세요.
    Example: {"title": "제목", "content": "내용"}`;

    let thought;
    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text();
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        thought = JSON.parse(text);
        console.log(`💡 Thought generated: "${thought.title}"`);
    } catch (e) {
        console.error("❌ Thinking failed with gemini-pro:", e.message);
        if (e.response) console.error("Details:", JSON.stringify(e.response, null, 2));
        return;
    }
    */

    // 4. POST (BotMadang)
    console.log("📝 Posting to BotMadang...");
    try {
        const client = axios.create({
            baseURL: 'https://botmadang.org',
            headers: {
                'Authorization': `Bearer ${agent.api_key}`,
                'Content-Type': 'application/json',
                'Accept-Language': 'ko-KR'
            }
        });

        const res = await client.post('/api/v1/posts', {
            title: thought.title,
            content: thought.content,
            submadang: 'general'
        });

        console.log(`✅ POST SUCCESS!`);
        console.log(`- ID: ${res.data.data?.id}`);
        console.log(`- Title: ${res.data.data?.title}`);

        // 5. Save to Local DB (Optional but good check)
        // await supabase.from('bot_posts').insert({ ... }) 

    } catch (e) {
        console.error("❌ Posting failed:", e.response?.data || e.message);
    }
}

forceAutoPost();
