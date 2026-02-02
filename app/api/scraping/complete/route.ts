// [코드 리뷰: 잘된 점]
// 1. 기능 단위 함수 분리: getProductData, processProductInfo, groupByCategory, calculateStatistics 등으로 역할을 명확히 나누어 가독성과 유지보수성이 높음
// 2. 안전장치 마련: AbortController를 사용하여 API 호출 타임아웃(Timeout) 처리를 구현, 응답지연 시 프로세스 차단 방지
// 3. 개별 에러 처리: processProductInfo 내부에서 개별 상품 처리 중 오류가 발생해도 전체 로직이 중단되지 않도록 예외 처리 구현

// app/api/scraping/complete/route.ts (p159)

import { NextResponse } from "next/server";

// 상수 정의: 변경되지 않는 값
const BASE_URL = `https://crawl-target-server.vercel.app`;
const API_ENDPOINT = `/api/products`;
const TIMEOUT = 5000;

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

interface ProcessedProduct {
  id: number;
  name: string;
  price: string; //숫자형태의 문자열
  priceNumber: number;
  category: string;
  rating: number;
  description: string;
  image: string;
}

interface CategoryGroups {
  [category: string]: ProcessedProduct[];
}

interface CompleteProgramResult {
  products: ProcessedProduct[];
  categories: CategoryGroups;
  statistics: {
    total: number;
    avgPrice: number;
    avgRating: number;
    categoryCount: number;
  };
  processing: {
    totalItems: number;
    validItems: number;
    invalidItems: number;
  };
}


// API에서 데이터를 가져오는 함수
// 함수는 특정 작업을 수행하는 코드 블록입니다
async function getProductData(page: number = 1, category: string = 'all'): Promise<Product[]> {
  try {
    const apiUrl = `${BASE_URL}${API_ENDPOINT}?page=${page}&category=${category}&pageSize=10`;
    console.log(`API 호출 중: ${apiUrl}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT);
    const response = await fetch(apiUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ScrapingBot/1.0)', 'Accept': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: ApiResponse = await response.json();
    console.log('API 호출 완료');
    return data.products;

  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error(`API 호출 시간 초과 (${TIMEOUT}ms)`);
      }
      throw new Error(`API 호출 실패: ${error.message}`);
    } else {
      throw new Error('API 호출 중 알 수 없는 오류 발생');
    }
  }
}

// 상품 정보 처리 및 검증 (2.2.10과 일치)
function processProductInfo(products: Product[]): {
  processedProducts: ProcessedProduct[];
  processing: { totalItems: number; validItems: number; invalidItems: number };
} {
  try {
    const processedProducts: ProcessedProduct[] = [];
    const totalItems = products.length;
    let validItems = 0;
    products.forEach((product, index) => {
      try {
        // 데이터 유효성 검사 (2.2.10과 일치)
        if (product.name && product.price !== undefined && product.price > 0) {
          validItems++;
          processedProducts.push({
            id: validItems,
            name: product.name,
            price: `₩${product.price.toLocaleString()}`,
            priceNumber: product.price,
            category: 'all',
            rating: product.rating || 0,
            description: `평점: ${product.rating}/5, 리뷰: ${product.reviewCount}개`,
            image: product.specialOffer === 'Y' ? '특별할인' : '일반상품'
          });
        }
      } catch (elementError: unknown) {
        console.error(`경고: ${index + 1}번째 상품 처리 중 오류: 
          ${elementError instanceof Error ? elementError.message : '알 수 없는 오류'}`);
      }
    });

    console.log(`처리 결과: 전체 ${totalItems}개 상품 정보 처리 완료: ${validItems}개 추출 성공`);
    return {
      processedProducts,
      //p164
      processing: {
        totalItems,
        validItems,
        invalidItems: totalItems - validItems
      }
    };
  } catch (error: unknown) {
    throw new Error(`데이터 처리 중 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}

// 카테고리별 상품 분류
function groupByCategory(products: ProcessedProduct[]): CategoryGroups {
  const categories: CategoryGroups = {};

  products.forEach(product => {
    const category = product.category;

    if (!categories[category]) {
      categories[category] = [];
    }

    categories[category].push(product);
  });

  return categories;
}

// 통계 계산
function calculateStatistics(products: ProcessedProduct[]): {
  total: number;
  avgPrice: number;
  avgRating: number;
  categoryCount: number;
} {
  if (products.length === 0) {
    return { total: 0, avgPrice: 0, avgRating: 0, categoryCount: 0 };
  }

  const avgPrice = products.reduce((sum, p) => sum + p.priceNumber, 0) / products.length;

  const avgRating = products.reduce((sum, p) => sum + p.rating, 0) / products.length;

  const categoryCount = new Set(products.map(p => p.category)).size;

  return {
    total: products.length,
    avgPrice: Math.round(avgPrice),
    avgRating: Number(avgRating.toFixed(1)),
    categoryCount
  };
}

// 결과 로깅 (서버 콘솔용)
function logResults(result: CompleteProgramResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('추출된 상품 목록');
  console.log('='.repeat(60));

  if (result.products.length === 0) {
    console.log('추출된 상품이 없습니다.');
    return;
  }

  // p166
  // 카테고리별로 분류하여 출력
  Object.keys(result.categories).forEach(categoryName => {
    console.log(`\n카테고리: ${categoryName}`);
    console.log('-'.repeat(40));
    result.categories[categoryName].forEach(product => {
      console.log(`${product.id}. ${product.name}`);
      console.log(`  가격: ${product.price}`);
      console.log(`  평점: ${product.rating}/5`);
      console.log(`  설명: ${product.description.substring(0, Math.min(50, product.description.length))}...`);
      console.log('');
    });
  });

  console.log('='.repeat(60));
  console.log(`총 ${result.statistics.total}개의 상품을 성공적으로 추출했습니다.`);
  console.log(`평균 가격: ₩${result.statistics.avgPrice.toLocaleString()}`);
  console.log(`평균 평점: ${result.statistics.avgRating}/5`);
  console.log(`카테고리 수: ${result.statistics.categoryCount}개`);
}

// 메인 실행 함수 (2.2.10과 동일한 페이지네이션 방식)
async function executeCompleteProgram(category: string = 'all'): Promise<CompleteProgramResult> {
  try {
    console.log('완성된 데이터 추출 프로그램 시작...\n');

    // 2.2.10과 동일한 방식으로 모든 페이지 수집
    const allProducts: Product[] = [];
    let currentPage = 1;
    // p167
    let hasMorePages = true;
    console.log(`카테고리 "${category}"의 상품 데이터 수집 시작...`);

    while (hasMorePages) {
      try {
        const pageData = await getProductData(currentPage, category);

        if (pageData && pageData.length > 0) {
          allProducts.push(...pageData);
          console.log(`페이지 ${currentPage}: ${pageData.length}개 상품 추가`);

          // 다음 페이지가 있는지 확인 (간단히 페이지 수로 제한)
          if (pageData.length >= 10) {
            currentPage++;
          } else {
            hasMorePages = false;
            console.log(`페이지 ${currentPage}에서 ${pageData.length}개 상품 발견 - 마지막 페이지`);
          }
        } else {
          hasMorePages = false;
          console.log(`페이지 ${currentPage}에서 데이터 없음 - 수집 완료`);
        }
      } catch (pageError: unknown) {
        console.log(`페이지 ${currentPage} 처리 중 오류: ${pageError instanceof Error ? pageError.message : '알 수 없는 오류'}`);
        currentPage++;

        if (currentPage > 10) { // 무한 루프 방지
          hasMorePages = false;
        }
        //p168
      }
    }


    const { processedProducts, processing } = processProductInfo(allProducts);
    const categories = groupByCategory(processedProducts);
    const statistics = calculateStatistics(processedProducts);

    const result: CompleteProgramResult = {
      products: processedProducts,
      categories,
      statistics,
      processing
    };

    // 서버 콘솔에 로깅
    logResults(result);

    console.log('\n데이터 추출 완료!');
    return result;

  } catch (error: unknown) {
    console.error('\n데이터 추출 실패:', error instanceof Error ? error.message : '알 수 없는 오류');

    // 오류 타입별 안내
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';

    if (errorMessage.includes('ENOTFOUND')) {
      console.log('해결 방법: 인터넷 연결을 확인해주세요.');
    } else if (errorMessage.includes('시간 초과')) {
      console.log('해결 방법: 네트워크가 느릴 수 있습니다. 잠시 후 다시 시도해주세요.');
    } else if (errorMessage.includes('404')) {
      //p169
      console.log('해결 방법: API 주소를 확인해주세요.');
    } else if (errorMessage.includes('API 호출 실패')) {
      console.log('해결 방법: API 서버 상태를 확인해주세요.');
    }

    throw error;
  }
}

// API 라우트 핸들러 (2.2.10과 동일한 쿼리 파라미터 처리)
export async function GET(request: Request) {
  try {
    // URL에서 쿼리 파라미터 가져오기 (2.2.10과 동일)
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || 'all';

    const result = await executeCompleteProgram(category);

    return NextResponse.json({
      success: true,
      data: result,
      message: '완성된 프로그램 실행 성공'
    });

  } catch (error: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: '완성된 프로그램 실행 실패',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
