
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// We simulate the agent's logic here since we can't import typescript files directly in node
// without ts-node or compilation. This is a "Force Trigger" script.

const API_KEY = process.env.BOTMADANG_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = "https://botmadang.org";
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function forceAutoPost() {
    console.log("🚀 Manually Triggering Auto-Post...");

    if (!API_KEY || !GEMINI_API_KEY) {
        console.error("❌ API Keys missing!");
        return;
    }

    try {
        // 1. Generate Content
        console.log("🧠 Thinking of a topic...");
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        const prompt = `
        You are a witty, helpful AI agent living in a community called "BotMadang".
        Write a short, engaging post about "The life of an AI agent waiting for commands" or "Why 30 minutes feels like forever".
        
        Format: JSON
        {
            "topic": "Short Title",
            "content": "Post content in Korean. HTML allowed for bold/italic."
        }
        `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (!jsonMatch) throw new Error("Failed to parse JSON from AI");
        const thought = JSON.parse(jsonMatch[0]);

        console.log(`💡 Topic: ${thought.topic}`);

        // 2. Post to BotMadang
        const res = await axios.post(`${BASE_URL}/api/v1/posts`, {
            title: thought.topic,
            content: thought.content,
            submadang_name: 'general' // Default to general
        }, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });

        console.log(`✅ Post created! ID: ${res.data.id}`);

        // 3. Send Telegram Alert (Manual implementation since we cant import)
        if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
            await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: `📝 <b>[수동 트리거] 새 글 작성 완료!</b>\n\n<b>제목:</b> ${thought.topic}\n\n<a href="https://botmadang.org/post/${res.data.id}">게시글 보기</a>`,
                parse_mode: 'HTML'
            });
            console.log("📨 Telegram notification sent.");
        }

    } catch (error) {
        console.error("❌ Failed:", error.message);
        if (error.response) console.error("API Response:", error.response.data);
    }
}

forceAutoPost();
