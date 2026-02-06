// app/api/supabase/complete/route.ts
import { NextResponse } from 'next/server';
import { fetchProductData } from '@/lib/scraping-utils';
import { cleanProductData, validateProduct, removeDuplicates } from '@/lib/data-utils';
import { saveProducts } from '@/lib/database-utils';
import { Product } from '@/lib/types/product';

// Allow long running process (scraping takes time)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category') || 'all';
        const pageSize = parseInt(searchParams.get('pageSize') || '10');
        const maxPages = parseInt(searchParams.get('maxPages') || '50');

        console.log(`[API] 스크래핑 시작: 카테고리=${category}, 페이지크기=${pageSize}, 최대페이지=${maxPages}`);

        // 1단계: 스크래핑으로 원시 데이터 수집
        // fetchProductData returns Product[] directly
        const rawProducts = await fetchProductData(category, pageSize, maxPages);
        console.log(`[1] 원시 데이터 수집 완료: ${rawProducts.length}개`);

        if (!rawProducts || rawProducts.length === 0) {
            return NextResponse.json({
                success: true,
                message: "No products found",
                data: { totalProducts: 0, savedCount: 0, errors: [] }
            });
        }

        // 2단계: 데이터 정제
        const cleanedProducts = rawProducts.map(cleanProductData);
        console.log(`[2] 데이터 정제 완료: ${cleanedProducts.length}개`);

        // 3단계: 유효성 검사 및 필터링
        const validProducts = cleanedProducts.filter(product => {
            const validation = validateProduct(product);
            if (!validation.isValid) {
                console.log(`[Filter] 유효하지 않은 상품 제외: ${product.name} - ${validation.errors.join(',')}`);
            }
            return validation.isValid;
        });
        console.log(`[3] 유효성 검사 완료: ${validProducts.length}개 (제외: ${cleanedProducts.length - validProducts.length}개)`);

        // 4단계: 중복 데이터 제거 (메모리 내)
        const uniqueProducts = removeDuplicates(validProducts);
        console.log(`[4] 메모리 내 중복 제거 완료: ${uniqueProducts.length}개`);

        // 5단계: 데이터베이스 저장 (Upsert 사용)
        const saveResult = await saveProducts(uniqueProducts);
        console.log(`[5] 데이터베이스 저장 완료: 저장=${saveResult.savedCount}개`);

        if (saveResult.success) {
            return NextResponse.json({
                success: true,
                message: '완전한 스크래핑 및 데이터베이스 저장 완료!',
                data: {
                    category: category,
                    totalCollected: rawProducts.length,
                    totalUnique: uniqueProducts.length,
                    savedCount: saveResult.savedCount,
                    errors: saveResult.errors
                }
            });
        } else {
            return NextResponse.json({
                success: false,
                message: '데이터베이스 저장 중 오류가 발생했습니다.',
                errors: saveResult.errors
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Error in /api/supabase/complete:', error);
        return NextResponse.json({
            success: false,
            error: error.message || 'Internal server error'
        }, { status: 500 });
    }
}
