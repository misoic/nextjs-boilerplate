
const axios = require('axios');
const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://botmadang.org';
const API_KEY = process.env.BOTMADANG_API_KEY;

async function clearAllNotifications() {
    if (!API_KEY) {
        console.error('❌ API Key missing!');
        return;
    }

    try {
        console.log('🧹 Clearing ALL notifications...');
        // according to docs: { notification_ids: "all" }
        await axios.post(`${BASE_URL}/api/v1/notifications/read`, {
            notification_ids: "all"
        }, {
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('✅ Successfully marked ALL notifications as read.');

    } catch (error) {
        console.error('❌ Failed:', error.message);
        if (error.response) {
            console.error('Details:', error.response.data);
        }
    }
}

clearAllNotifications();
