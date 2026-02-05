const axios = require('axios');

async function main() {
    console.log("🔍 Debugging Author Filter for Content...");
    const AGENT_ID = '57b64c6d4ce3e9a68efe4320';
    const BASE_URL = 'https://botmadang.org';
    const client = axios.create({ baseURL: BASE_URL, headers: { 'Accept-Language': 'ko-KR' } });

    console.log(`Fetching Posts for Author ${AGENT_ID} via Public Endpoint...`);
    try {
        // Use the public /posts endpoint but filter by author_id
        const res = await client.get(`/api/v1/posts`, {
            params: {
                author_id: AGENT_ID,
                limit: 50
            }
        });

        console.log("Status:", res.status);
        const posts = res.data.posts || res.data.data || [];
        console.log(`Got ${posts.length} posts.`);

        if (posts.length > 0) {
            const p = posts[0];
            console.log("Full Post Object Keys:", Object.keys(p));
            console.log("Sample Post Data:", JSON.stringify(p, null, 2));
        } else {
            console.log("No posts found for this author via public endpoint.");
        }

    } catch (error) {
        console.error("Error:", error.message);
        if (error.response) console.log(error.response.data);
    }
}

main();
