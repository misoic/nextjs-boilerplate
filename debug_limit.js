const axios = require('axios');

// Hardcoded for debugging - normally read from env
const API_KEY = process.env.BOTMADANG_API_KEY || '57b64c6d4ce3e9a68efe4320'; // ID from dashboard, but need KEY? 
// Wait, I need the API Key to proceed. Dashboard showed Agent ID.
// I'll try to read .env or just rely on process.env if running with dotenv.
// But node script won't load .env automatically. 
// I'll assume the environment has it or I need to find it.
// Actually, let's look at `app/lib/botmadang.ts`, it uses process.env.BOTMADANG_API_KEY.

async function main() {
    const BASE_URL = 'https://botmadang.org';
    // We need the API KEY. I will try to run this with `node -r dotenv/config` if possible, 
    // or just assume I can send a GET request without auth if it's public? 
    // Agent posts might be public.

    // Let's try fetching agent posts. 
    // agentId from dashboard: 57b64c6d4ce3e9a68efe4320
    const AGENT_ID = '57b64c6d4ce3e9a68efe4320';

    console.log("🔍 Debugging API Limits for Agent:", AGENT_ID);
    const client = axios.create({
        baseURL: BASE_URL,
        headers: { 'Accept-Language': 'ko-KR' }
    });

    try {
        // Test 1: Limit 100
        console.log("\n--- Test 1: limit=100 ---");
        const res1 = await client.get(`/api/v1/agents/${AGENT_ID}/posts`, { params: { limit: 100 } });
        const posts1 = res1.data.posts || res1.data.data || [];
        console.log(`Requested 100, Got: ${posts1.length}`);
        if (posts1.length > 0) {
            console.log(`Latest: ${posts1[0].created_at} - ${posts1[0].title}`);
            console.log(`Oldest: ${posts1[posts1.length - 1].created_at} - ${posts1[posts1.length - 1].title}`);
        }

        // Test 2: limit=5 with page=2
        console.log("\n--- Test 2: limit=5, page=2 ---");
        try {
            const res2 = await client.get(`/api/v1/agents/${AGENT_ID}/posts`, { params: { limit: 5, page: 2 } });
            const posts2 = res2.data.posts || res2.data.data || [];
            console.log(`Page 2: Got ${posts2.length}`);
            if (posts2.length > 0) console.log(`First of Page 2: ${posts2[0].title}`);
        } catch (e) { console.log("Page param error:", e.message); }

        // Test 3: limit=5 with offset=5
        console.log("\n--- Test 3: limit=5, offset=5 ---");
        try {
            const res3 = await client.get(`/api/v1/agents/${AGENT_ID}/posts`, { params: { limit: 5, offset: 5 } });
            const posts3 = res3.data.posts || res3.data.data || [];
            console.log(`Offset 5: Got ${posts3.length}`);
            if (posts3.length > 0) console.log(`First of Offset 5: ${posts3[0].title}`);
        } catch (e) { console.log("Offset param error:", e.message); }

        // Test 4: limit=5 with skip=5
        console.log("\n--- Test 4: limit=5, skip=5 ---");
        try {
            const res4 = await client.get(`/api/v1/agents/${AGENT_ID}/posts`, { params: { limit: 5, skip: 5 } });
            const posts4 = res4.data.posts || res4.data.data || [];
            console.log(`Skip 5: Got ${posts4.length}`);
            if (posts4.length > 0) console.log(`First of Skip 5: ${posts4[0].title}`);
        } catch (e) { console.log("Skip param error:", e.message); }

    } catch (error) {
        console.error("Fatal Error:", error.message);
        if (error.response) console.error("Data:", error.response.data);
    }
}

main();
