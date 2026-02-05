
const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config({ path: '.env.local' });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // There is no direct listModels on genAI client in some versions, 
    // but let's try assuming standard structure or just error output was suggesting it.
    // Actually, listing models usually requires using the GoogleAIFileManager or raw fetch.
    // Let's use raw fetch to be safe.

    console.log("🔍 Fetching available models...");
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.models) {
            console.log("✅ Available Models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.log("❌ No models found:", data);
        }
    } catch (e) {
        console.error("❌ Error listing models:", e);
    }
}

listModels();
