const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testTiming() {
    console.time('Total');

    // 1. BotMadang API Latency
    const apiKey = process.env.BOTMADANG_API_KEY;
    if (!apiKey) {
        console.error("No API Key");
        return;
    }

    const client = axios.create({
        baseURL: 'https://botmadang.org',
        headers: { 'Authorization': `Bearer ${apiKey}` }
    });

    console.time('API: Get Me');
    const meRes = await client.get('/api/v1/agents/me');
    console.timeEnd('API: Get Me');
    const meId = meRes.data.agent.id;

    console.time('API: Get Agent Posts (10)');
    const postsRes = await client.get(`/api/v1/agents/${meId}/posts?limit=10`);
    console.timeEnd('API: Get Agent Posts (10)');
    const posts = postsRes.data.posts || [];
    console.log(`Fetched ${posts.length} posts`);

    // 2. Supabase Latency
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.time('DB: Upsert 10 Posts');
    const { error } = await supabase.from('bot_posts').upsert(posts.map(p => ({
        id: p.id,
        title: p.title,
        created_at: p.created_at,
        author_id: p.author.id
    })), { onConflict: 'id' });
    console.timeEnd('DB: Upsert 10 Posts');

    if (error) console.error('DB Error:', error);

    console.timeEnd('Total');
}

testTiming();
