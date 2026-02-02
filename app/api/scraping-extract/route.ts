// app/api/scraping-extract/route.ts (p135)

import { NextResponse } from "next/server";

// TypeScript 인터페이스 정의: 데이터 구조를 명확히 정의
// interface는 객체의 구조를 정의하는 방법입니다
interface Product {
    id: string;             // 상품 아이디
    name: string;           // 상품명
    price: number;          // 가격
    rating: number;         // 별점
    reviewCount: number;    // 리뷰 개수
}

interface ApiResponse {
    products: Product[];     // 상품 목록
    pagination: {           // 페이지네이션 정보
        hasNextPage: boolean;   // 다음 페이지 존재 여부
    }
}


interface ScrapedData {
    scrapedAt: string;      // 스크래핑 시간
    category: string;       // 카테고리
    totalProducts: number;  // 총 상품 수
    products: Product[];    // 상품 목록
}


// 상수 정의: 변경되지 않는 값
const BASE_URL = `https://crawl-target-server.vercel.app`;
const API_ENDPOINT = `/api/products`;
export async function GET(request: Request) {

  // URL에서 쿼리 파라미터 가져오기
  const { searchParams } = new URL(request.url);
  const category = searchParams.get(`category`) || 'all'; //카테고리 파라미터, 없으면 `all`사용

// 변수 정의 : 반복문에서 값이 변경되는 변수들
  const allProducts: Product[] = [];    // 모든 상품을 저장할 배열(배열 참조는 상수, 내용은 변경 가능)
  let currentPage = 1;                  // 현재 처리 중인 페이지 번호
  let hasMorePages = true;              // 더 많은 페이지가 있는지 확인하는 변수수

  // 콘솔에서 시작 메시지 출력 (개발자가 확인용)
  console.log(`카테고리: "${category}"의 상품 데이터 추출 시작...`);
  
 // 반복문: 모든 페이지를 순차적으로 처리
  while (hasMorePages) {
  // 변수를 사용하여 동적 URL 생성
  // 템플릿 리터럴(백틱 `) 을 사용하여 문자열을 동적으로 만듦
  const apiUrl = `${BASE_URL}${API_ENDPOINT}?page=${currentPage}&category=${category}&pageSize=10`;

  console.log(`페이지 ${currentPage} 처리 중...`);

  // 실제 API 호출
  // fetch는 웹에서 데이터를 가져오는 기본 방법입니다
  const response = await fetch(apiUrl);

  // JSON 데이터를 JavaScript 객체로 변환
  const data: ApiResponse = await response.json();

  // 현재 페이지의 상품들을 처리
  if (data.products && data.products.length > 0) {
    const extractedProducts: Product[] = data.products.map((product: Product) => {
        return {
            id: product.id,                     // 상품 아아디
            name: product.name,                 // 상품명
            price: product.price,               // 가격
            rating: product.rating,             // 별점
            reviewCount: product.reviewCount    // 리뷰 개수수
        };
    });

    // 스프레드 연산자(...)를 사용하여 배열의 모든 요소를 추가
    allProducts.push(...extractedProducts);
    console.log(`페이지 ${currentPage}: ${extractedProducts.length}개 상품 추출 완료`);
    
    // pagination 정보를 사용하여 다음 페이지 존재 여부 확인
    // API 응답에 포함된 hasNextPage 값을 확인
    if (data.pagination.hasNextPage) {
      currentPage++; // 다음 페이지로 이동 (currentPage = currentPage + 1과 같음)
    } else {
      hasMorePages = false; // 더이상 페이지가 없으므로 반복문 종료
      console.log(`페이지 ${currentPage}에서 ${extractedProducts.length}개 상품 발견 - 마지막 페이지`);
    }

  } else {
    // 데이터가 없으면 반복문 종료
    hasMorePages = false;
    console.log(`페이지 ${currentPage}에서 데이터 없음 - 추출 완료`);
  }

}

// 스크래핑 완료 시간 기록
const scrapedAt = new Date().toISOString(); // 현재 시간을 ISO 형식으로 변환

// 최종 응답 데이터 구성
const scrapedData: ScrapedData = {
    scrapedAt: scrapedAt,       // 스크래핑 시간
    category: category,         // 카테고리
    totalProducts: allProducts.length,  // 총 상품 수
    products: allProducts       // 추출된 상품 목록 
};

console.log(`총 ${allProducts.length}개 상품 추출 완료 - ${scrapedAt}`);


  // 클라이언트에게 응답 데이터 전송
  return NextResponse.json({ 
    success: true, // 성공 여부를 알려주는 플래그
    data: scrapedData
   });
  
}
 