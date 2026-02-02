// app/api/scraping/route.ts

// Next.js에서 제공하는 서버 관련 기능들을 가져옵니다
import { NextResponse } from "next/server";

// GET 요청을 처리하는 함수를 정의합니다
export async function GET() {
    const response = await fetch("https://crawl-target-server.vercel.app/api/products?category=books&page=1&pageSize=3");
    const data = await response.json();

    // 성공적으로 데이터를 가져왔을 때의 응답을 만듭니다
    return NextResponse.json({
        success: true,
        data: {
            result: data,
            category: "books",
            page: 1,
            pageSize: 3,
        },
    });
 
}