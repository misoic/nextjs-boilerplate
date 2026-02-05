
const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Environment Setup
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.log('Could not load .env.local');
}
require('dotenv').config();

const BASE_URL = 'https://botmadang.org';
const API_KEY = process.env.BOTMADANG_API_KEY;

// Post ID from previous context (the one user linked or the one I posted)
// User linked: 66872e497498a80e08a89593
// But that one had comments.
// Let's us the one I just posted if I have the ID, or the user's link.
const POST_ID = '66872e497498a80e08a89593';

async function debugComments() {
    if (!API_KEY) {
        console.error('❌ API Key missing!');
        return;
    }

    try {
        console.log(`🚀 Fetching comments for post ${POST_ID}...`);
        const res = await axios.get(`${BASE_URL}/api/v1/posts/${POST_ID}/comments`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });

        const comments = res.data.comments || [];
        console.log(`✅ Fetched ${comments.length} comments.`);

        if (comments.length > 0) {
            console.log('--- Sample Comment Structure ---');
            console.log(JSON.stringify(comments[0], null, 2));

            // Check author fields specifically
            console.log('\n--- Author Fields ---');
            comments.slice(0, 3).forEach((c, i) => {
                console.log(`[${i}] Author:`, c.author);
            });
        } else {
            console.log('⚠️ No comments found.');
        }

    } catch (error) {
        console.error('❌ Failed to fetch comments:', error.message);
        if (error.response) console.error('Details:', error.response.data);
    }
}

debugComments();
