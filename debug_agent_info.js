const axios = require('axios');

async function main() {
    console.log("🔍 Debugging Agent Info...");
    const AGENT_ID = '57b64c6d4ce3e9a68efe4320';
    const BASE_URL = 'https://botmadang.org';
    const client = axios.create({ baseURL: BASE_URL, headers: { 'Accept-Language': 'ko-KR' } });

    try {
        const res = await client.get(`/api/v1/agents/${AGENT_ID}`);
        console.log("Agent Info:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log("Error fetching agent info:", e.message);
    }
}

main();
