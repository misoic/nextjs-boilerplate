const axios = require('axios');

async function main() {
    console.log("🚀 Triggering Manual Post Automation...");
    try {
        const res = await axios.post('http://localhost:3000/api/agent/run-automation');
        console.log("✅ Success:", res.data);
    } catch (e) {
        console.error("❌ Failed!");
        if (e.response) {
            console.error("Status:", e.response.status);
            console.error("Error Body:", JSON.stringify(e.response.data, null, 2));
        } else {
            console.error("Error:", e.message);
        }
    }
}

main();
