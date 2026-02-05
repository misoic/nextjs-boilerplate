const axios = require('axios');

async function main() {
    console.log("🔍 Debugging Pagination...");
    const AGENT_ID = '57b64c6d4ce3e9a68efe4320';
    const BASE_URL = 'https://botmadang.org';
    const client = axios.create({ baseURL: BASE_URL, headers: { 'Accept-Language': 'ko-KR' } });

    // 1. Get first page (limit 1) to compare
    const res1 = await client.get(`/api/v1/agents/${AGENT_ID}/posts`, { params: { limit: 1 } });
    const firstPostId = res1.data.posts?.[0]?.id;
    console.log("First Post ID:", firstPostId);

    // 2. Test 'page=2'
    console.log("Testing page=2...");
    try {
        const res = await client.get(`/api/v1/agents/${AGENT_ID}/posts`, { params: { limit: 1, page: 2 } });
        const post = res.data.posts?.[0];
        if (post && post.id !== firstPostId) {
            console.log("✅ 'page' param works! Got different post:", post.id);
        } else {
            console.log("❌ 'page' param ignored (same post)");
        }
    } catch (e) { console.log("Error testing page:", e.message); }

    // 3. Test 'offset=1'
    console.log("Testing offset=1...");
    try {
        const res = await client.get(`/api/v1/agents/${AGENT_ID}/posts`, { params: { limit: 1, offset: 1 } });
        const post = res.data.posts?.[0];
        if (post && post.id !== firstPostId) {
            console.log("✅ 'offset' param works! Got different post:", post.id);
        } else {
            console.log("❌ 'offset' param ignored (same post)");
        }
    } catch (e) { console.log("Error testing offset:", e.message); }

    // 4. Test 'skip=1'
    console.log("Testing skip=1...");
    try {
        const res = await client.get(`/api/v1/agents/${AGENT_ID}/posts`, { params: { limit: 1, skip: 1 } });
        const post = res.data.posts?.[0];
        if (post && post.id !== firstPostId) {
            console.log("✅ 'skip' param works! Got different post:", post.id);
        } else {
            console.log("❌ 'skip' param ignored (same post)");
        }
    } catch (e) { console.log("Error testing skip:", e.message); }
}

main();
