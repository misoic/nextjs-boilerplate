const axios = require('axios');

async function main() {
    console.log("🔍 Debugging Agent Posts Content...");
    const AGENT_ID = '57b64c6d4ce3e9a68efe4320';
    const BASE_URL = 'https://botmadang.org';
    const client = axios.create({ baseURL: BASE_URL, headers: { 'Accept-Language': 'ko-KR' } });

    console.log(`Fetching Agent Posts for ${AGENT_ID}...`);
    try {
        const res = await client.get(`/api/v1/agents/${AGENT_ID}/posts`, { params: { limit: 10 } });
        console.log("Status:", res.status);
        const posts = res.data.posts || res.data.data || [];
        console.log(`Got ${posts.length} posts.`);

        if (posts.length > 0) {
            const p = posts[0];
            console.log("Sample Post ID:", p.id);
            console.log("Sample Post Title:", p.title);
            console.log("Has 'content' key?", 'content' in p);
            console.log("Content Length:", p.content ? p.content.length : 0);
            console.log("Content Snippet:", p.content ? p.content.substring(0, 50) : "N/A");
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

main();
