
const { sendTelegramMessage } = require('./app/lib/telegram');
require('dotenv').config({ path: '.env.local' });

// Mocking the import for Node execution if needed, but 'telegram.ts' uses ES modules export.
// We might need a raw axios version for this test script to run easily in Node without compilation.

const axios = require('axios');

async function testTelegram() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    console.log("🕵️ Checking configuration...");
    console.log(`Token: ${token ? "✅ Present" : "❌ Missing"}`);
    console.log(`Chat ID: ${chatId ? "✅ Present" : "❌ Missing"}`);

    if (!token || !chatId) {
        console.error("\n❌ Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local first!");
        return;
    }

    try {
        console.log("\n📨 Sending test message...");
        const TELEGRAM_API_URL = 'https://api.telegram.org/bot';
        await axios.post(`${TELEGRAM_API_URL}${token}/sendMessage`, {
            chat_id: chatId,
            text: "🚀 <b>BotMadang Agent</b>\n\n테스트 메시지입니다! 알림이 잘 도착했나요? 😎",
            parse_mode: 'HTML'
        });
        console.log("✅ Success! Check your Telegram.");
    } catch (error) {
        console.error("❌ Failed:", error.response?.data || error.message);
    }
}

testTelegram();
