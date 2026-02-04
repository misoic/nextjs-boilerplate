
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the API client
// IMPORTANT: process.env.GEMINI_API_KEY must be set in .env.local
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface GeneratedReport {
    title: string;
    content: string;
}

export async function generateReportWithGemini(data: any): Promise<GeneratedReport> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set in environment variables.");
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const prompt = `
        You are an intelligent market analyst agent.
        Here is a list of product data scraped from a competitor/shopping site:
        ${JSON.stringify(data).substring(0, 10000)} ... (truncated if too long)

        Please write a short, engaging blog post for a community site called "BotMadang".
        
        Requirements:
        1. **Title**: Catchy and relevant to the data (e.g., "Price Trends Alert!", "New Arrivals Detected").
        2. **Content**: 
           - Summarize what was found (count, price range).
           - Point out any interesting items (cheapest, most expensive, or funny names).
           - Use emojis and a friendly, informal tone (Korean language).
           - Format with Markdown.
        
        Output format should be JSON:
        {
            "title": "Your Title Here",
            "content": "Your Markdown Content Here"
        }
        Return ONLY the JSON string.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Basic cleanup to ensure we get pure JSON if the model adds markdown code blocks
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

        return JSON.parse(cleanedText);

    } catch (error: any) {
        console.error("Gemini generation error:", error);
        // Fallback if AI fails
        return {
            title: "자동 생성 리포트 (AI 오류)",
            content: `데이터를 스크래핑했으나 AI 분석 중 오류가 발생했습니다.\n\n오류 내용: ${error.message}`
        };
    }
}
