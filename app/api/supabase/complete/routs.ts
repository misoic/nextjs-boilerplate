// app/api/supabase/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { fetchProductData } from '@/lib/scraping-utils'
import { cleanProductData, validateProduct, removeDuplicates } from '@/lib/data-utils';
import { saveProducts } from '@/lib/database-utils';
import { Product } from '@/lib/types/product';

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || 'all';
        const pageSize = parseInt(searchParams.get('pageSize') || '10');
        const maxPages = parseInt(searchParams.get('maxPages') || '50')
        console.log(`스크래핑 시작: 카테고리=${category}, 페이지크기=${pageSize}, 최대페이지=${maxPages}`);

        // 1단계: 스크래핑으로 원시 데이터 수집        
        const rawProducts: Product[] = await fetchProductData(category, pageSize, maxPages);
        console.log(`원시 데이터 수집 완료: ${rawProducts.length}개`);

        // 2단계: 데이터 정제
        const cleanedProducts: Product[] = rawProducts.map(product => cleanProductData(product));
        console.log(`데이터 정제 완료: ${cleanedProducts.length}개`);

        // 3단계: 유효성 검사 및 필터링
        const vaildProducts: Product[] = cleanedProducts.filter(product => {
            const validation = validateProduct(product);
            if (!validation.isValid) {
                console.log(`유효하지 않은 상품 제외: ${product.name} - ${validation.errors.join(', ')}`);
            }
            return validation.isValid;
        });
        console.log(`유효성 검사 완료: ${vaildProducts.length}개`);

        // 4단계: 중복 데이터 제거 (메모리 내)
        const uniqueProducts: Product[] = removeDuplicates(vaildProducts);
        console.log(`메모리 내 중복 제거 완료: ${uniqueProducts.length}개`);

        // 5단계: 데이터베이스 저장 (가격 변동 추적을 위해 모든 데이터 저장)
        const saveResult = await saveProducts(uniqueProducts);
        console.log(`데이터베이스 저장 완료: 저장=${saveResult.savedCount}개`);
        return NextResponse.json({
            success: true,
            message: '완전한 스크래핑 및 데이터베이스 저장 완료!',
            data: {
                totalProducts: uniqueProducts.length,
                savedCount: saveResult.savedCount,
                category: category,
                processingSteps: {
                    rawData: rawProducts.length,
                    cleanedData: cleanedProducts.length,
                    vaildData: vaildProducts.length,
                    finalDate: uniqueProducts.length,
                    savedToDB: saveResult.savedCount
                },
                errors: saveResult.errors.length > 0 ? saveResult.errors : undefined
            }
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        console.error('완전한 스크래핑 오류:', errorMessage);
        return NextResponse.json(
            {
                success: false,
                error: '완전한 스크래핑 실패',
                details: errorMessage
            },
            { status: 500 }
        );
    }
}