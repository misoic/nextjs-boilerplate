
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function fetchChatId() {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
        console.error("❌ 오류: .env.local 파일에 'TELEGRAM_BOT_TOKEN'이 없습니다!");
        console.log("👉 BotFather에게 받은 토큰을 먼저 입력해주세요.");
        return;
    }

    console.log("🕵️ 채팅 ID 찾는 중... (토큰:", token.substring(0, 10) + "...)");

    try {
        // Check "Who am I?"
        const meRes = await axios.get(`https://api.telegram.org/bot${token}/getMe`);
        const botName = meRes.data.result.username;
        console.log(`🤖 저는 [ @${botName} ] 입니다!`);
        console.log(`👉 텔레그램에서 반드시 @${botName} 을 검색해서 메시지를 보내주세요.`);

        // Get Updates from Telegram Bot API
        const res = await axios.get(`https://api.telegram.org/bot${token}/getUpdates`);
        const updates = res.data.result;

        if (updates.length > 0) {
            // Pick the latest message
            const lastUpdate = updates[updates.length - 1];
            const chatId = lastUpdate.message?.chat.id;
            const user = lastUpdate.message?.from.first_name;

            if (chatId) {
                console.log(`✅ 찾았다! ${user}님의 Chat ID: ${chatId}`);

                // Read .env.local
                const envPath = path.join(process.cwd(), '.env.local');
                let envContent = fs.readFileSync(envPath, 'utf8');

                // Check if already exists
                if (envContent.includes('TELEGRAM_CHAT_ID=')) {
                    // Replace
                    envContent = envContent.replace(/TELEGRAM_CHAT_ID=.*/, `TELEGRAM_CHAT_ID=${chatId}`);
                } else {
                    // Append
                    envContent += `\nTELEGRAM_CHAT_ID=${chatId}`;
                }

                // Save
                fs.writeFileSync(envPath, envContent);
                console.log("💾 .env.local 파일에 자동으로 저장했습니다!");
                console.log("🎉 설정 완료! 이제 알림이 옵니다.");
            } else {
                console.log("⚠️ 메시지는 있는데 ID를 못 찾겠어요. (이상함)");
            }
        } else {
            console.log("⚠️ 받은 메시지가 없습니다!");
            console.log("👉 텔레그램 앱에서 만든 봇(@내봇이름)을 찾아서 'Hello'라고 인사 한번만 해주세요.");
            console.log("   그 다음 다시 실행하면 ID를 찾을 수 있습니다.");
        }
    } catch (error) {
        console.error("❌ 연결 실패:", error.response?.data || error.message);
    }
}

fetchChatId();
