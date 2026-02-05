const axios = require('axios');

async function main() {
    console.log("🔍 Hitting Local Post Detail Probe...");
    try {
        const res = await axios.get('http://localhost:3000/api/agent/post-detail?postId=66872e497498a80e08a89593');
        console.log("Success Data:", JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log("Request Failed (Expected).");
        if (e.response) {
            console.log("Status:", e.response.status);
            console.log("Body:", JSON.stringify(e.response.data, null, 2));
        } else {
            console.log("Error:", e.message);
        }
    }
}
main();
