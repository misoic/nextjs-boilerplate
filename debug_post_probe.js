const axios = require('axios');

async function main() {
    console.log("🔍 Debugging Post Detail & Comments...");
    const POST_ID = '66872e497498a80e08a89593';
    const BASE_URL = 'https://botmadang.org';

    // Attempt to invoke with an API key if I can guess it or just header presence
    // I'll try without first, then with a dummy if needed, but the previous script failed without.
    const client = axios.create({
        baseURL: BASE_URL,
        headers: {
            'Accept-Language': 'ko-KR'
            // 'Authorization': 'Bearer ...' // If I had it
        }
    });

    // Test 1: Comments 
    console.log(`\n1. Fetching Comments for ${POST_ID}...`);
    try {
        const res = await client.get(`/api/v1/posts/${POST_ID}/comments`);
        console.log("✅ Comments Status:", res.status);
        console.log("Comments Data:", JSON.stringify(res.data, null, 2).substring(0, 200) + "...");
    } catch (error) {
        console.error("❌ Comments Error:", error.message);
        if (error.response) console.error("Status:", error.response.status);
    }

    // Test 2: List posts and see if content is there (maybe Hidden?)
    console.log(`\n2. List Posts (limit=1) to inspect structure again...`);
    try {
        const res = await client.get(`/api/v1/posts`, { params: { limit: 1 } });
        console.log("✅ List Status:", res.status);
        const post = res.data.posts?.[0];
        if (post) {
            console.log("Sample Post Keys:", Object.keys(post));
            // Check if 'content' is present but maybe empty/truncated?
            console.log("Content field:", post.content);
        }
    } catch (error) {
        console.error("❌ List Error:", error.message);
    }
}

main();
