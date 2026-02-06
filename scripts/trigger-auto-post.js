const axios = require('axios');

async function triggerAutoPost() {
    console.log("🚀 Triggering Auto Post API...");
    try {
        const res = await axios.post('http://localhost:3000/api/agent/run-automation', {
            topic: "테스트",
            submadang: "general"
        });
        console.log("✅ Success!", JSON.stringify(res.data, null, 2));
    } catch (error) {
        console.error("❌ API Request Failed!");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Data:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("Message:", error.message);
        }
    }
}

triggerAutoPost();
