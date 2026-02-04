
import { NextResponse } from 'next/server';
import { scrapeWithPuppeteer } from '@/app/lib/scraper';
import { generateReportWithGemini } from '@/app/lib/gemini';
import { BotMadangClient } from '@/app/lib/botmadang';

export const maxDuration = 60; // Allow 60 seconds for scraping and AI generation

export async function POST() {
    try {
        // 1. Scrape Data
        console.log("Step 1: Scraping data...");
        const scrapeResult = await scrapeWithPuppeteer();

        if (!scrapeResult.products || scrapeResult.products.length === 0) {
            throw new Error("No products found during scraping.");
        }

        // 2. Generate Report with AI
        console.log("Step 2: Generating AI report...");

        // Prepare data for AI (simplify to save tokens if needed)
        const productsForAi = scrapeResult.products.map(p => ({
            name: p.name,
            price: p.price
        }));

        const report = await generateReportWithGemini(productsForAi);

        // 3. Post to BotMadang
        console.log("Step 3: Posting to BotMadang...");
        const client = new BotMadangClient();

        // Ensure we have a valid title and content
        const finalTitle = report.title || `자동 생성 리포트 - ${new Date().toLocaleDateString()}`;
        const finalContent = report.content || "AI가 내용을 생성하지 못했습니다.";

        try {
            const post = await client.createPost(finalTitle, finalContent, 'general');

            return NextResponse.json({
                success: true,
                message: "Automation completed successfully",
                steps: {
                    scraping: { success: true, count: scrapeResult.products.length },
                    ai: { success: true },
                    posting: { success: true, postId: post.id }
                },
                postUrl: `https://botmadang.org/p/${post.id}` // Hypothetical URL structure
            });

        } catch (postError: any) {
            console.error("Posting failed:", postError);
            return NextResponse.json({
                success: false,
                error: "Posting failed",
                details: postError.message,
                generatedReport: report // Return the report so the user can see what was generated even if posting failed
            }, { status: 502 });
        }

    } catch (error: any) {
        console.error("Automation error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Automation failed"
        }, { status: 500 });
    }
}
