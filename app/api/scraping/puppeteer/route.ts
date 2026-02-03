/**
 * [코드 리뷰 리포트]
 * 작성자: AI Assistant
 * 작성일: 2026-02-03
 *
 * 1. 전반적인 구조 (Structure):
 *    - Next.js App Router의 Route Handler 패턴을 준수하여 GET 요청을 적절히 구현했습니다.
 *    - TypeScript 인터페이스를 활용하여 반환 타입 안정성을 확보했습니다.
 * 
 * 2. 안정성 (Stability):
 *    - try-catch-finally 블록을 사용하여 예외 발생 시에도 브라우저 리소스가 누수되지 않도록 처리했습니다.
 *    - Chromium 실행 경로를 OS별로 분기 처리하여 개발 및 배포 환경 호환성을 고려했습니다.
 *
 * 3. 개선 제안 (Suggestions):
 *    - 타겟 URL이 하드코딩되어 있습니다. 환경 변수(process.env)로 분리하는 것을 권장합니다.
 *    - 네트워크 대기 설정(networkidle0)은 상황에 따라 타임아웃을 유발할 수 있으므로, domcontentloaded 등으로 최적화할 여지가 있습니다.
 */
// app/api/scraping/puppeteer/route.ts

// Next.js에서 제공하는 서버 관련 기능들을 가져옵니다
import { NextResponse } from "next/server";
import puppeteer, { Browser, Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

// 타입 정의
interface ScrapedProduct {
    name: string;
    price: string;
    image?: string;
}

interface PuppeteerResult {
    products: ScrapedProduct[];
    metadata: {
        totalFound: number;
        scrapingTime: number;
        url: string;
    };
}

async function scrapeWithPuppeteer(): Promise<PuppeteerResult> {
    const startTime = Date.now();
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
        console.log("퍼피티어 브라우저 실행 중...");

        // puppeteer-core를 사용할 때는 executablePath가 필요합니다.
        // 로컬 개발 환경과 배포 환경(Vercel 등)을 고려한 설정입니다.
        // Local development fallback paths
        const localExePath = process.platform === 'win32'
            ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            : process.platform === 'linux'
                ? "/usr/bin/google-chrome"
                : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

        let executablePath: string;

        // 개발 환경일 경우 로컬 Chrome 경로를 우선 사용
        if (process.env.NODE_ENV === 'development') {
            executablePath = localExePath;
        } else {
            // 배포 환경에서는 @sparticuz/chromium 사용
            executablePath = await chromium.executablePath() || localExePath;
        }

        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: executablePath,
            headless: true,
        });

        page = await browser.newPage();

        //브라우저 설정
        await page.setViewport({ width: 1280, height: 720 });
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");

        console.log('페이지 로딩 중...');
        await page.goto('https://crawl-target-server.vercel.app', {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // 페이지가 완전히 로드될 때까지 대기
        console.log('콘텐츠 로딩 대기 중...');
        await page.waitForSelector('h3', { timeout: 15000 });

        //추가 대기 (동적 콘덴츠 완전 로딩)
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('상품 정보 추출 중...');

        // 상품 데이터 추출
        const products = await page.evaluate(() => {
            const productElements = document.querySelectorAll('main > section');
            const productList: ScrapedProduct[] = [];
            productElements.forEach(section => {
                const productCards = section.querySelectorAll('div[class*="grid"] > div');

                productCards.forEach(card => {
                    const nameElement = card.querySelector('h3');
                    const priceElement = card.querySelector('span[class*="text-xl"]');
                    const imageElement = card.querySelector('img');
                    if (nameElement && priceElement) {
                        productList.push({
                            name: nameElement.textContent || '',
                            price: priceElement.textContent || '',
                            image: imageElement?.src || '',
                        });
                    }
                });
            });
            return productList;
        });

        const endtime = Date.now();
        const scrapingTime = endtime - startTime;
        console.log('Puppteer 스크래핑 완료');
        console.log(`총 ${products.length}개의 상품 발견`);
        console.log(`소요 시간: ${scrapingTime}ms`);

        return {
            products,
            metadata: {
                totalFound: products.length,
                scrapingTime,
                url: 'https://crawl-target-server.vercel.app'
            }
        };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("크롤링 중 오류 발생:", errorMessage)
        throw new Error(`Puppeteer 실행 실패: ${errorMessage}`);
    } finally {
        // 리소스 정리
        try {
            if (page) await page.close();
            if (browser) await browser.close();
            console.log('브라우저 리소스 정리 완료');
        } catch (cleanupError: unknown) {
            const cleanupMessage = cleanupError instanceof Error ? cleanupError.message : '알 수 없는 오류';
            console.error('리소스 정리 중 오류:', cleanupMessage);
        }
    }
}

// GET 요청을 처리하는 함수를 정의합니다
export async function GET() {
    try {
        const result = await scrapeWithPuppeteer();
        return NextResponse.json({
            success: true,
            data: result,
            message: 'Puppeteer 스크래핑 성공'
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
        console.error('API 라우트 오류:', errorMessage);
        return NextResponse.json(
            {
                success: false,
                error: 'Puppeteer 스크래핑 실패',
                details: errorMessage
            },
            { status: 500 }
        );
    }
}