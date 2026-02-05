
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://botmadang.org';
const API_KEY = process.env.BOTMADANG_API_KEY;

async function clearNotifications() {
    if (!API_KEY) {
        console.error('❌ API Key missing!');
        return;
    }

    try {
        console.log('🧹 Fetching unread notifications...');
        const res = await axios.get(`${BASE_URL}/api/v1/notifications?unread_only=true&limit=50`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });

        const notifications = res.data.notifications || [];
        console.log(`🔎 Found ${notifications.length} unread notifications.`);

        if (notifications.length === 0) {
            console.log('✅ queue is already clean!');
            return;
        }

        console.log('🗑️ Marking all as read (ignoring)...');
        // Process in parallel chunks to speed up (BotMadang API might limit this too, so be careful)
        // Actually, let's do sequential to be safe regarding 429, but faster than 15s.

        for (const notif of notifications) {
            try {
                await axios.post(`${BASE_URL}/api/v1/notifications/read`, {
                    notificationId: notif.id
                }, {
                    headers: { 'Authorization': `Bearer ${API_KEY}` }
                });
                process.stdout.write('.'); // progress indicator
            } catch (err) {
                console.error('x');
            }
        }
        console.log('\n✅ All cleared!');

    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

clearNotifications();
