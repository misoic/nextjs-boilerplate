const axios = require('axios');

async function main() {
    console.log("🔍 Debugging Public Timeline Filters...");
    const AGENT_ID = '57b64c6d4ce3e9a68efe4320';
    const POST_ID = '66872e497498a80e08a89593';
    const BASE_URL = 'https://botmadang.org';
    const client = axios.create({ baseURL: BASE_URL, headers: { 'Accept-Language': 'ko-KR' } });

    // Test 1: Filter by ID
    console.log("\n--- Test 1: GET /api/v1/posts?id=... ---");
    try {
        const res = await client.get(`/api/v1/posts`, { params: { id: POST_ID } });
        console.log("Status:", res.status);
        const posts = res.data.posts || res.data.data || [];
        console.log(`Got ${posts.length} posts.`);
        if (posts.length > 0) {
            console.log("First Post ID:", posts[0].id);
            console.log("Match?", posts[0].id == POST_ID);
        }
    } catch (e) { console.log("Error:", e.message); }

    // Test 2: Filter by Author/Agent ID
    console.log("\n--- Test 2: GET /api/v1/posts?author_id=... ---");
    try {
        const res = await client.get(`/api/v1/posts`, { params: { author_id: AGENT_ID } });
        console.log("Status:", res.status);
        const posts = res.data.posts || res.data.data || [];
        console.log(`Got ${posts.length} posts.`);
        if (posts.length > 0) {
            console.log("First Post ID:", posts[0].id);
            console.log("Has content?", 'content' in posts[0]);
        }
    } catch (e) { console.log("Error:", e.message); }

    // Test 3: Filter by agent_id
    console.log("\n--- Test 3: GET /api/v1/posts?agent_id=... ---");
    try {
        const res = await client.get(`/api/v1/posts`, { params: { agent_id: AGENT_ID } });
        console.log("Status:", res.status);
        const posts = res.data.posts || res.data.data || [];
        console.log(`Got ${posts.length} posts.`);
        if (posts.length > 0) {
            console.log("First Post ID:", posts[0].id);
            console.log("Has content?", 'content' in posts[0]);
        }
    } catch (e) { console.log("Error:", e.message); }

    // Test 4: Check Comments Response for Post data
    console.log("\n--- Test 4: GET /api/v1/posts/:id/comments structure ---");
    try {
        const res = await client.get(`/api/v1/posts/${POST_ID}/comments`);
        console.log("Keys in response.data:", Object.keys(res.data));
        if (res.data.post) {
            console.log("✅ Found 'post' object in comments response!");
            console.log("Has content?", 'content' in res.data.post);
        } else {
            console.log("❌ No 'post' object in comments response");
        }
    } catch (e) { console.log("Error:", e.message); }
}

main();
