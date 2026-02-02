// app/api/scraping-categorize/route.ts (p142)

import { NextResponse } from "next/server";

// TypeScript 인터페이스 정의: 데이터 구조를 명확히 정의
interface Product {
  id: string;             // 상품 아이디
  name: string;           // 상품명
  price: number;          // 가격
  rating: number;         // 별점
  reviewCount: number;    // 리뷰 개수
  specialOffer: string;   // 특별 할인 (선택적)
}

interface ApiResponse {
  products: Product[];     // 상품 목록
  pagination: {           // 페이지네이션 정보
    hasNextPage: boolean;   // 다음 페이지 존재 여부
  }
}

interface CategorizedData {
  scrapedAt: string;      // 스크래핑 시간
  category: string;       // 카테고리
  totalProducts: number;  // 총 상품 수
  priceCategories: {
    budget: Product[];    // 저가
    midRange: Product[];  // 중가
    premium: Product[];   // 고가
  }
  specialOffers: Product[]; // 특별 할인 상품
  topRated: Product[];    // 최고 평점 상품
}

// 상수 정의: 변경되지 않는 값
const BASE_URL = `https://crawl-target-server.vercel.app`;
const API_ENDPOINT = `/api/products`;


// API에서 데이터를 가져오는 함수
// 함수는 특정 작업을 수행하는 코드 블록입니다
async function fetchPageData(page: number, category: string): Promise<ApiResponse> {
  const apiUrl = `${BASE_URL}${API_ENDPOINT}?page=${page}&category=${category}&pageSize=10`;
  console.log(`페이지 ${page} 데이터 가져오는 중...`);
  const response = await fetch(apiUrl);
  const data: ApiResponse = await response.json();
  return data;
}

// 상품 데이터를 추출하는 함수
// 필요한 필드만 추출하여 새로운 객체를 만듭니다
function extractProductData(rawProducts: Product[]): Product[] {
  return rawProducts.map((product: Product) => ({
    id: product.id,                     // 상품 아이디
    name: product.name,                 // 상품명
    price: product.price,               // 가격
    rating: product.rating,             // 별점
    reviewCount: product.reviewCount,    // 리뷰개수
    specialOffer: product.specialOffer  // 특별 할인
  }));

}

// 새로 추가된 함수: 조건문을 사용하여 상품을 분류하는 함수
function categorizeProducts(products: Product[]): CategorizedData {
  const budget: Product[] = [];
  const midRange: Product[] = [];
  const premium: Product[] = [];
  const specialOffers: Product[] = [];
  const topRated: Product[] = [];

  products.forEach(product => {
    // 가격대 분류
    if (product.price < 50000) {
      budget.push(product);
    } else if (product.price < 200000) {
      midRange.push(product);
      console.log(`중간가 상품: ${product.name} - ₩${product.price.toLocaleString()}`);
    } else {
      premium.push(product);
      console.log(`고가 상품: ${product.name} - ₩${product.price.toLocaleString()}`);
    }

    // 특별 할인 상품
    if (product.specialOffer === `Y`) {
      specialOffers.push(product);
      console.log(`특별 할인 상품: ${product.name} - ₩${product.price.toLocaleString()}`);
    }

    // 최고 평점 상품
    if (product.rating >= 4.5) {
      topRated.push(product);
      console.log(`최고 평점 상품: ${product.name} - 평점: ${product.rating}`);
    }
  });

  return {
    scrapedAt: new Date().toISOString(),
    category: `all`,
    totalProducts: products.length,
    priceCategories: {
      budget,
      midRange,
      premium
    },
    specialOffers,
    topRated
  };
}


export async function GET(request: Request) {

  // URL에서 쿼리 파라미터 가져오기
  const { searchParams } = new URL(request.url);
  const category = searchParams.get(`category`) || 'all'; //카테고리 파라미터, 없으면 `all`사용

  // 변수 정의 : 반복문에서 값이 변경되는 변수들
  const allProducts: Product[] = [];    // 추출된 상품을 저장할 배열(배열 참조는 상수, 내용은 변경 가능)
  let currentPage = 1;                  // 현재 처리 중인 페이지 번호
  let hasMorePages = true;              // 더 많은 페이지가 있는지 확인하는 변수

  // 콘솔에서 시작 메시지 출력 (개발자가 확인용)
  console.log(`카테고리: "${category}"의 상품 데이터 추출 시작...`);

  // 반복문: 모든 페이지를 순차적으로 처리
  while (hasMorePages) {
    // 함수를 사용하여 상품 데이터 추룰
    const pageData = await fetchPageData(currentPage, category);

    // 현재 페이지의 상품들을 처리
    if (pageData.products && pageData.products.length > 0) {

      // 함수를 사용하여 상품 데이터 추출
      const extractedProducts = extractProductData(pageData.products);

      // 추출된 상품들을 전체 목록에 추가
      allProducts.push(...extractedProducts);

      console.log(`페이지 ${currentPage}: ${extractedProducts.length}개 상품 추출 완료`);

      // pagination 정보를 사용하여 다음 페이지 존재 여부 확인

      if (pageData.pagination.hasNextPage) {
        currentPage++;            // 다음 페이지로 이동
      } else {
        hasMorePages = false;     // 더 이상 페이지가 없으므로 반복문 종료
        console.log(`페이지 ${currentPage}에서 ${extractedProducts.length}개 상품 발견 - 마지막 페이지`);
      }

    } else {
      // 데이터가 없으면 반복문 종료
      hasMorePages = false;
      console.log(`페이지 ${currentPage}에서 데이터 없음 - 추출 완료`);
    }
  }

  // 데이터 분류 및 구조화
  const categorizedData = categorizeProducts(allProducts);
  console.log(`총 ${allProducts.length}개 상품 분류 완료`);
  console.log(`예산 상품: ${categorizedData.priceCategories.budget.length}개`);
  console.log(`중간가 상품: ${categorizedData.priceCategories.midRange.length}개`);
  console.log(`프리미엄 상품: ${categorizedData.priceCategories.premium.length}개`);
  console.log(`특별 할인 상품: ${categorizedData.specialOffers.length}개`);
  console.log(`최고 평점 상품: ${categorizedData.topRated.length}개`);


  // 클라이언트에게 응답 데이터 전송
  return NextResponse.json({
    success: true, // 성공 여부를 알려주는 플래그
    data: categorizedData
  });

}
