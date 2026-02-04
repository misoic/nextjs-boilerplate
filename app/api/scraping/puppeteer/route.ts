
import { NextResponse } from "next/server";
import { scrapeWithPuppeteer } from "@/app/lib/scraper";

export async function GET() {
    try {
        const result = await scrapeWithPuppeteer();
        return NextResponse.json({
            success: true,
            data: result,
            message: 'Puppeteer 스크래핑 성공'
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        console.error('API 라우트 오류:', errorMessage);
        return NextResponse.json(
            {
                success: false,
                error: 'Puppeteer 스크래핑 실패',
                details: errorMessage
            },
            { status: 500 }
        );
    }
}