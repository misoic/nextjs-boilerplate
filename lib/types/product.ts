// lib/types/product.ts

// 타입 정의 - 상품 데이터의 구조를 정의합니다
export interface Product {
    id: string;
    name: string;
    price: number;
    originPrice: number;
    category: string;
    rating: number;
    reviewCount: number;
    specialOffer: string | boolean;
    sellerName: string;
    sellerEmail: string;
    collectedAt?: string;
}
export interface ApiResponse {
    prodects: Product[];
    pagination: {
        hasNextPageL boolean;
    };
}
export interface ScrapingConfig {
    baseUrl: string,
    timeout: number,
    userAgent: string;
}