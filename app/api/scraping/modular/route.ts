// app/api/scraping/modular/route.ts

import { NextResponse } from 'next/server';
import { fetchProductData } from '@/lib/scraping-utils';

export async function GET(request: Request) {
    try {
        // URL에서 쿼리 파라미터 가져오기
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || 'all';
        const pageSize = parseInt(searchParams.get('pageSize') || '10');
        const maxPages = parseInt(searchParams.get('maxPages') || '50');

        // 공통 함수를 사용해서 모든 페이지 데이터 수집
        const products = await fetchProductData(category, pageSize, maxPages);

        return NextResponse.json({
            success: true,
            data: {
                products: products,
                totalCount: products.length,
                category: category,
                pageSize: pageSize,
                maxPages: maxPages
            },
            message: '모듈화된 스크래핑 성공'
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        console.error('Modular scraping error:', error);
        return NextResponse.json(
            {
                success: false,
                error: '모듈화된 스크래핑 실패',
                details: errorMessage
            },
            { status: 500 }
        );
    }
}