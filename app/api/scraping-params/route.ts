// app/api/scraping-params/route.ts (개선된 버전)

import { NextResponse } from "next/server";

// API 주소·기본값 상수 (하드코딩 제거)
// const 키워드로 선언하면 한 번 설정한 값을 변경할 수 없습니다.
const BASE_URL = `https://crawl-target-server.vercel.app`;
const API_ENDPOINT = `/api/products`;
export async function GET(request: Request) {

  // URL에서 쿼리 파라미터 가져오기
  // 사용자가 브라우저에서 ?category=fashion 같은 파라미터를 입력했을 때
  const { searchParams } = new URL(request.url);
  const category = searchParams.get(`category`) || 'all'; //카테고리 파라미터, 없으면 `all`사용

// 변수 정의 : 반복문에서 값이 변경되는 변수들
// let 키워드로 선언하면 나중에 값을 변경할 수 있습니다.
  const allProducts: any[] = []; // 모든 상품을 저장할 배열(배열 참조는 상수, 내용은 변경 가능)
  let currentPage = 1;
  let hasMorePages = true;

  // 콘솔에서 시작 메시지 출력 (개발자가 확인용)
  console.log(`카테고리: "${category}"의 모든 상품 수집 시작...`);
  
 // 반복문: 모든 페이지를 순차적으로 처리
 // while문은 조건이 참일 때까지 계속 반복합니다
 while (hasMorePages) {
  // 변수를 사용하여 동적 URL 생성
  // 템플릿 리터럴(백틱 `) 을 사용하여 문자열을 동적으로 만듦
  const apiUrl = `${BASE_URL}${API_ENDPOINT}?page=${currentPage}&category=${category}&pageSize=10`;

  console.log(`페이지 ${currentPage} 처리 중...`);

  // 실제 API 호출
  // fetch는 웹에서 데이터를 가져오는 기본 방법입니다
  const response = await fetch(apiUrl);

  // JSON 데이터를 JavaScript 객체로 변환
  const data = await response.json();

  // 서버 부하 방지를 위한 대기 (100ms)
  // 연속적인 API 호출로 인한 차단을 방지합니다
  await new Promise(resolve => setTimeout(resolve, 100));

  // 현재 페이지의 상품들을 전체 목록에 추가
  // data.products가 존재하고 길이가 0보다 클 때만 실행
  if (data.products && data.products.length > 0) {

    // 스프레드 연산자(...)를 사용하여 배열의 모든 요소를 추가
    allProducts.push(...data.products);
    console.log(`페이지 ${currentPage}: ${data.products.length}개 상품 추가`);
    
    // pagination 정보를 사용하여 다음 페이지 존재 여부 확인
    // API 응답에 포함된 hasNextPage 값을 확인
    if (data.pagination.hasNextPage) {
      currentPage++; // 다음 페이지로 이동 (currentPage = aurrentPage + 1과 같음)
    } else {
      hasMorePages = false; // 더 이상상 페이지가 없으므로 반복문 종료
      console.log(`페이지 ${currentPage}에서 ${data.products.length}개 상품 발견 - 마지막 페이지`);
    }
  } else {
    // 데이터가 없으면 반복문 종료
    hasMorePages = false;
    console.log(`페이지 ${currentPage}에서 데이터 없음 - 수집 완료`);
  }

}

  // 수집된 상품들을 콘솔에 출력 (개발자가 확인용)
  allProducts.forEach((product: any, index: number) => {
    console.log(`${index + 1}번째 상품;`, product.name, `\${product.price.toLocaleString()}`);
  });

  // 최종 결과를 콘솔에 출력
  console.log(`총 ${allProducts.length}개 상품 수집 완료`);

  // 클라이언트에게 응답 데이터 전송
  return NextResponse.json({ 
    success: true, // 성공 여부를 알려주는 플래그
    data: allProducts, // 원본 상품 목록
    total: allProducts.length, // 총 상품 개수
    category: category, // 선택된 카테고리
    pagesProcessed: currentPage // 처리된 페이지 수수
  });
  
}
 