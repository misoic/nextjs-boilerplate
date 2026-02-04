// app/api/files/csv/scraping/route.ts
import { NextResponse } from 'next/server';
import { fetchProductData } from '@/lib/scraping-utils';
import { createObjectCsvWriter } from 'csv-writer';
import { join } from 'path';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || 'all';
        const pageSize = parseInt(searchParams.get('pageSize') || '10');
        const maxPages = parseInt(searchParams.get('maxPages') || '50');

        // 공통 함수를 사용해서 모든 페이지 데이터 수집
        const products = await fetchProductData(category, pageSize, maxPages);

        // CSV 파일 생성
        const fileName = `products_${category}_${new Date().toISOString().split('T')[0]}.csv`;
        const filePath = join(process.cwd(), fileName);
        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'id', title: '상품ID' },
                { id: 'name', title: '상품명' },
                { id: 'price', title: '가격' },
                { id: 'rating', title: '평점' },
                { id: 'reviewCount', title: '리뷰 수' },
                { id: 'specialOffer', title: '특별할인' }
            ],
            encoding: 'utf-8'
        });

        await csvWriter.writeRecords(products);

        return NextResponse.json({
            success: true,
            data: {
                fileName: fileName,
                filePath: filePath,
                totalProducts: products.length,
                category: category
            }
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        return NextResponse.json(
            {
                success: false,
                error: '스크래핑 및 CSV 저장 실패',
                details: errorMessage
            },
            { status: 500 }
        );
    }
}