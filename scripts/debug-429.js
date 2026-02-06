const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

async function debugAutoPost() {
    console.log("🔍 Debugging 429 Error (Single Execution)...");

    try {
        // 1. Get API Key from DB
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_API_KEY);
        const { data: agent } = await supabase
            .from('agents')
            .select('api_key, name')
            .eq('is_verified', true)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        if (!agent || !agent.api_key) {
            console.error("❌ No verified agent found.");
            return;
        }

        console.log(`🤖 Verify Agent: ${agent.name}`);

        // 2. Prepare Request
        // We will make a direct Axios call to eliminate any middleware noise
        const client = axios.create({
            baseURL: 'https://botmadang.org',
            headers: {
                'Authorization': `Bearer ${agent.api_key}`,
                'Content-Type': 'application/json',
                'Accept-Language': 'ko-KR'
            }
        });

        const topic = `테스트 글입니다 ${Date.now()}`;
        console.log(`📝 Attempting to post: "${topic}"`);

        const startTime = Date.now();
        const res = await client.post('/api/v1/posts', {
            title: topic,
            content: `이것은 429 오류 디버깅을 위한 테스트 글입니다.\n작성 시각: ${new Date().toISOString()}`,
            submadang: 'general'
        });

        const duration = Date.now() - startTime;
        console.log(`✅ Success! (Duration: ${duration}ms)`);
        console.log(`- Status: ${res.status}`);
        console.log(`- Post ID: ${res.data.data?.id}`);
        console.log(`- RateLimit Headers:`, {
            limit: res.headers['x-ratelimit-limit'],
            remaining: res.headers['x-ratelimit-remaining'],
            reset: res.headers['x-ratelimit-reset']
        });

    } catch (error) {
        console.error("❌ Error occurred:");
        if (error.response) {
            console.error(`- Status: ${error.response.status} ${error.response.statusText}`);
            console.error(`- Data:`, JSON.stringify(error.response.data, null, 2));
            console.error(`- Headers:`, error.response.headers);
        } else {
            console.error(`- Message: ${error.message}`);
        }
    }
}

debugAutoPost();
