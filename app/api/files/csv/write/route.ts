// app/api/files/csv/write/route.ts

import { NextResponse } from "next/server";
import { createObjectCsvWriter } from "csv-writer";
import { join } from 'path';

export async function GET() {
    try {
        const products = [
            { name: "무선 마우스", price: 29900, category: "전자제품", rating: 4.5 },
            { name: "기계식 키보드", price: 89000, category: "전자제품", rating: 4.8 },
            { name: "게이밍 키보드", price: 250000, category: "전자제품", rating: 4.7 },
            { name: "무선 이어폰", price: 120000, category: "전자제품", rating: 4.3 }
        ];

        const filePath = join(process.cwd(), 'products.csv');
        const csvWriter = createObjectCsvWriter({
            path: filePath,
            header: [
                { id: 'name', title: '상품명' },
                { id: 'price', title: '가격' },
                { id: 'category', title: '카테고리' },
                { id: 'rating', title: '평점' }
            ],
            encoding: 'utf8'
        });

        await csvWriter.writeRecords(products);

        return NextResponse.json({
            success: true,
            message: 'CSV 파일에 상품 데이터가 성공적으로 저장되었습니다.',
            filePath: filePath,
            recordCount: products.length,
        });
    } catch (error) {
        console.error('CSV 파일 작성 중 오류:', error);

        return NextResponse.json(
            { success: false, error: 'CSV 저장 오류' },
            { status: 500 }
        );
    }
}
