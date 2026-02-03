// app/api/files/csv/write/route.ts

import { NextResponse } from "next/server";
import { createObjectCsvWriter } from "csv-writer";
import { join } from 'path';

export async function GET() {
    try {
        const baseProducts = [
            { name: "무선 마우스", price: 29900, category: "전자제품", rating: 4.5 },
            { name: "기계식 키보드", price: 89000, category: "전자제품", rating: 4.8 },
            { name: "게이밍 키보드", price: 150000, category: "전자제품", rating: 4.7 },
            { name: "무선 이어폰", price: 120000, category: "전자제품", rating: 4.3 },
            { name: "게이밍 모니터", price: 350000, category: "전자제품", rating: 4.6 },
            { name: "USB-C 허브", price: 45000, category: "액세서리", rating: 4.4 },
            { name: "노트북 스탠드", price: 32000, category: "액세서리", rating: 4.5 },
            { name: "스마트워치", price: 299000, category: "전자제품", rating: 4.2 },
            { name: "블루투스 스피커", price: 79000, category: "음향기기", rating: 4.6 },
            { name: "외장 SSD 1TB", price: 159000, category: "저장장치", rating: 4.9 }
        ];

        // 10개 제품을 5번 반복하여 50개 데이터 생성
        const products = Array(5).fill(baseProducts).flat();

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
