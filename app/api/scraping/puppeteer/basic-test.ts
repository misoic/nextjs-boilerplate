import puppeteer from 'puppeteer';

// 1. 전체 프로세스를 감싸는 큰 비동기 블록입니다.
async function startFirstScraping() {
    // 2. 브라우저라는 객체는 변하면 안 되니 const로 선언합니다.
    const browser = await puppeteer.launch({ headless: true });

    try {
        // 3. 페이지 객체를 생성합니다. (타입은 자동으로 추론됩니다)
        const page = await browser.newPage();

        // 4. 특정 주소로 이동합니다. (Unix의 원격 접속과 비슷하죠)
        await page.goto('https://www.google.com');

        // 5. 페이지의 제목을 긁어와서 변수에 담습니다.
        const title: string = await page.title();

        console.log(`------------------------------`);
        console.log(`성공적으로 가져온 제목: ${title}`);
        console.log(`------------------------------`);

    } catch (error: any) {
        // 6. 에러가 나면 여기서 잡습니다. (보안 담당자의 예외 처리!)
        console.error("오류가 발생했습니다:", error.message);
    } finally {
        // 7. 성공하든 실패하든 브라우저는 반드시 닫아야 합니다 (fclose와 같은 이치)
        await browser.close();
        console.log("브라우저 자원을 안전하게 해제했습니다.");
    }
}

startFirstScraping();