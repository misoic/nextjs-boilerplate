const { GoogleGenerativeAI } = require("@google/generative-ai");
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

async function testGemini() {
    console.log("🧠 Testing Gemini API...");
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("❌ GEMINI_API_KEY is missing.");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // Test potentially problematic model name
    const modelName = "gemini-2.5-flash";
    // Usually it is 'gemini-1.5-flash' or 'gemini-pro'. '2.5' sounds like a typo or hallucination unless it's very new.

    console.log(`Testing model: ${modelName}`);

    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, are you there?");
        console.log("✅ Success!");
        console.log("Response:", result.response.text());
    } catch (error) {
        console.error(`❌ Failed with ${modelName}:`, error.message);

        console.log("\nRetrying with 'gemini-1.5-flash'...");
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent("Hello?");
            console.log("✅ Success with 1.5-flash!");
            console.log("Response:", result.response.text());
        } catch (e) {
            console.error("❌ Failed with 1.5-flash:", e.message);

            console.log("\nRetrying with 'gemini-pro'...");
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-pro" });
                const result = await model.generateContent("Hello?");
                console.log("✅ Success with gemini-pro!");
            } catch (e2) {
                console.error("❌ Failed with gemini-pro:", e2.message);
            }
        }
    }
}

testGemini();
