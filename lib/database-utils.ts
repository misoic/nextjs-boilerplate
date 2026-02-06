// lib/database-utils.ts
import { supabase } from '@/app/lib/supabase';
import { Product, productToDB } from './types/product';

// 상품 데이터 저장 (가격 변동 추적을 위해 모든 데이터 저장)
export async function saveProducts(products: Product[]): Promise<{
    success: boolean;
    savedCount: number;
    errors: string[];
}> {
    const errors: string[] = [];
    let savedCount = 0;
    try {
        // 모든 상품을 데이터베이스에 저장 (가격 변동 추적을 위해)
        for (const product of products) {
            const productDB = productToDB(product);
            const { error: insertError } = await supabase
                .from('products')
                .upsert([productDB], { onConflict: 'product_id' }); // Duplicate Key 해결: 없으면 추가, 있으면 수정
            if (insertError) {
                errors.push(`저장 실패 (${product.name}): ${insertError.message}`);
            } else {
                savedCount++;
            }
        }
        return { success: true, savedCount, errors };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '상품 저장 실패';
        errors.push(errorMessage);
        return { success: false, savedCount, errors };
    };
}