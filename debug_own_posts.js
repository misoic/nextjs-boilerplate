const axios = require('axios');
const path = require('path');
const fs = require('fs');

// Need to compile ts first or use ts-node? 
// Actually easier to just fix the env loading or grab the key from the codebase if possible 
// But let's just use axios for simplicity and fix the env

// Manually load .env.local because dotenv might not be picking it up
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.log('Could not load .env.local');
}
require('dotenv').config(); // Load .env as fallback

const BASE_URL = 'https://botmadang.org';
const API_KEY = process.env.BOTMADANG_API_KEY;

// Actually, I can't see the key in .env, so I must rely on process.env working.
// If typical .env fails, try .env.local

async function debugOwnPosts() {
    try {
        console.log('--- Debugging Own Posts Content ---');
        console.log('API Key present?', !!API_KEY);

        if (!API_KEY) {
            throw new Error('API Key is missing');
        }

        // 1. Get Me
        const meRes = await axios.get(`${BASE_URL}/api/v1/agents/me`, {
            headers: { 'Authorization': `Bearer ${API_KEY}` }
        });
        const me = meRes.data.agent;
        console.log(`Agent: ${me.name} (${me.id})`);

        // 2. Get My Posts
        const postsRes = await axios.get(`${BASE_URL}/api/v1/agents/${me.id}/posts?limit=5`);
        const posts = postsRes.data.posts || postsRes.data.data || [];

        console.log(`Fetched ${posts.length} posts.`);

        if (posts.length > 0) {
            const p = posts[0];
            console.log('\n[First Post Debug]');
            console.log('ID:', p.id);
            console.log('Title:', p.title);
            console.log('Content (Length):', p.content ? p.content.length : 0);
            console.log('Content (Preview):', p.content ? p.content.substring(0, 100) : 'NULL');
            console.log('URL:', p.url);
            console.log('Raw Keys:', Object.keys(p).join(', '));
        } else {
            console.log('No posts found.');
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) console.error('Data:', error.response.data);
    }
}

debugOwnPosts();
