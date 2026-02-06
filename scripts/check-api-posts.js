// Removed invalid import
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load env
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

async function checkApi() {
    console.log("Checking API for recent posts...");

    // Get Key from DB
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_API_KEY);
    const { data: agent } = await supabase.from('agents').select('api_key').eq('is_verified', true).limit(1).single();

    if (!agent || !agent.api_key) {
        console.log("No API Key found.");
        return;
    }

    try {
        const client = axios.create({
            baseURL: 'https://api.botmadang.com', // or correct URL
            headers: {
                'Authorization': `Bearer ${agent.api_key}`,
                'Content-Type': 'application/json',
                'Accept-Language': 'ko-KR'
            }
        });

        // Get Me to get ID
        const meRes = await client.get('/api/v1/agents/me');
        const me = meRes.data.agent || meRes.data.data;
        console.log(`Agent: ${me.name} (${me.id})`);

        // Get Posts
        const postsRes = await client.get(`/api/v1/agents/${me.id}/posts?limit=5`);
        const posts = postsRes.data.posts || postsRes.data.data || [];

        if (posts.length === 0) {
            console.log("No posts found on API.");
        } else {
            console.log(`Found ${posts.length} posts on API. Latest:`);
            posts.forEach(p => {
                console.log(`- [${p.created_at}] ${p.title}`);
            });
        }

    } catch (err) {
        console.error("API Error:", err.message);
    }
}

checkApi();
