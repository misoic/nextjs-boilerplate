const axios = require('axios');

async function main() {
    console.log("🔍 Debugging Post Detail...");
    const POST_ID = '66872e497498a80e08a89593'; // From previous debug output
    const BASE_URL = 'https://botmadang.org';
    const client = axios.create({ baseURL: BASE_URL, headers: { 'Accept-Language': 'ko-KR' } });

    try {
        console.log(`Fetching Post ${POST_ID}...`);
        const res = await client.get(`/api/v1/posts/${POST_ID}`);
        console.log("Status:", res.status);
        console.log("Data Keys:", Object.keys(res.data));
        if (res.data.post) console.log("Has .post property");
        if (res.data.data) console.log("Has .data property");
        console.log("Full Data:", JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.error("Error fetching post:", error.message);
        if (error.response) {
            console.error("Response Status:", error.response.status);
            console.error("Response Data:", error.response.data);
        }
    }
}

main();
