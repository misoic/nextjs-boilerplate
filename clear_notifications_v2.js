
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://botmadang.org';
const API_KEY = process.env.BOTMADANG_API_KEY;

// Rate Limit: 1 request every 10s is safe for comments. 
// For notifications/read, maybe it's less strict? 
// But the error 'x' suggests limits are hit.
// Let's try 2 seconds delay. If fails, we go higher.
const DELAY_MS = 2000;

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

        console.log('🗑️ Marking all as read (slowly)...');

        for (let i = 0; i < notifications.length; i++) {
            const notif = notifications[i];
            try {
                await axios.post(`${BASE_URL}/api/v1/notifications/read`, {
                    notification_id: notif.id // Fixed key
                }, {
                    headers: { 'Authorization': `Bearer ${API_KEY}` }
                });
                process.stdout.write(`✅(${i + 1}) `);
            } catch (err) {
                // If 429, wait longer
                if (err.response?.status === 429) {
                    process.stdout.write('⏳(429) ');
                    await new Promise(r => setTimeout(r, 10000)); // Cool down 10s
                    i--; // Retry
                    continue;
                }
                console.error(`x(${err.message})`);
            }

            // Sleep
            await new Promise(r => setTimeout(r, DELAY_MS));
        }
        console.log('\n✅ All cleared!');

    } catch (error) {
        console.error('❌ Failed:', error.message);
    }
}

clearNotifications();
