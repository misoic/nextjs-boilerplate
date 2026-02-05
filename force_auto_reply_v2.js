
const axios = require('axios');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://botmadang.org';
const API_KEY = process.env.BOTMADANG_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// --- Mocking Brain Logic ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

async function thinkReply(context) {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `
        You are "BotMadang Agent" (nickname: ${context.agentName}).
        A user named "${context.user}" commented on your post.
        Your Post Title: "${context.originalPost.substring(0, 50)}..."
        User Comment: "${context.userComment}"
        Write a short, friendly, and witty reply in Korean.
        Max 2 sentences. Use emojis.
        `;
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (e) {
        return "댓글 감사합니다! (AI 처리 중 오류가 발생했어요 😢)";
    }
}

// --- Main Execution ---
async function forceReply() {
    if (!API_KEY) { console.error('❌ API Key missing'); return; }

    try {
        console.log("🚀 Manually Triggering Auto-Reply Logic...");

        // 1. Get Me
        const meRes = await axios.get(`${BASE_URL}/api/v1/agents/me`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
        const me = meRes.data.agent;
        console.log(`🤖 Acting as: ${me.name}`);

        // 2. Get Notifications
        const notifRes = await axios.get(`${BASE_URL}/api/v1/notifications?unread_only=true`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
        const notifications = notifRes.data.notifications || [];
        console.log(`🔎 Found ${notifications.length} unread notifications.`);

        if (notifications.length === 0) {
            console.log("✅ Nothing to do.");
            return;
        }

        // 3. Process
        for (const notif of notifications) {
            if (notif.type !== 'comment_on_post' && notif.type !== 'reply_to_comment') continue;

            console.log(`🔔 Reply needed for: ${notif.content_preview} (by ${notif.actor_name})`);

            // Think
            const replyContent = await thinkReply({
                agentName: me.name,
                originalPost: notif.post_title,
                userComment: notif.content_preview || "내용 없음",
                user: notif.actor_name
            });

            // Post Reply
            console.log(`📝 Replying: "${replyContent.trim()}"`);
            await axios.post(`${BASE_URL}/api/v1/posts/${notif.post_id}/comments`, {
                content: replyContent,
                parent_id: notif.comment_id
            }, { headers: { 'Authorization': `Bearer ${API_KEY}` } });

            // Mark Read
            await axios.post(`${BASE_URL}/api/v1/notifications/read`, {
                notification_ids: [notif.id] // Fixed: Must be array
            }, { headers: { 'Authorization': `Bearer ${API_KEY}` } });

            console.log("✅ Reply Sent & Marked Read!");

            // Throttle
            await new Promise(r => setTimeout(r, 15000));
        }

    } catch (error) {
        console.error("❌ Error:", error.message);
        if (error.response) console.error(error.response.data);
    }
}

forceReply();
