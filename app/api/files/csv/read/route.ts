// app/api/files/csv/read/route.ts

import { NextResponse } from "next/server";
import { createReadStream } from 'fs';
import csv from 'csv-parser';
import { join } from 'path';

export async function GET() {
    try {
        const filePath = join(process.cwd(), 'products.csv');
        const results: Array<{
            상품명: string;
            가격: number;
            카테고리: string;
            평점: number;
        }> = [];
        return new Promise((resolve) => {
            createReadStream(filePath)
                .pipe(csv())
                .on('data', (data: Record<string, string>) => {

                    // 숫자 타입 변환
                    const processedData = {
                        상품명: data.상품명,
                        가격: parseInt(data.가격),
                        카테고리: data.카테고리,
                        평점: parseFloat(data.평점)
                    };

                    results.push(processedData);
                })
                .on('end', () => {
                    resolve(NextResponse.json({
                        success: true,
                        message: 'CSV 파일 읽기 완료!',
                        data: results,
                        totalRecords: results.length
                    }));
                })
                .on('error', (streamError) => {
                    console.error('스트림 읽기 오류:', streamError);
                    resolve(NextResponse.json(
                        { success: false, error: 'CSV 읽기 오류' },
                        { status: 500 }
                    ));
                });
        });
    } catch (error) {
        console.error('CSV 파일 읽기 중 오류:', error);
        return NextResponse.json(
            { success: false, error: 'CSV 읽기 오류' },
            { status: 500 }
        );
    }
}           