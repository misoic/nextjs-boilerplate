
import puppeteer, { Browser, Page } from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export interface ScrapedProduct {
    name: string;
    price: string;
    image?: string;
}

export interface ScrapingResult {
    products: ScrapedProduct[];
    metadata: {
        totalFound: number;
        scrapingTime: number;
        url: string;
    };
}

export async function scrapeWithPuppeteer(): Promise<ScrapingResult> {
    const startTime = Date.now();
    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
        console.log("Starting Puppeteer scraping...");

        const localExePath = process.platform === 'win32'
            ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
            : process.platform === 'linux'
                ? "/usr/bin/google-chrome"
                : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

        let executablePath: string;

        if (process.env.NODE_ENV === 'development') {
            executablePath = localExePath;
        } else {
            executablePath = await chromium.executablePath() || localExePath;
        }

        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: executablePath,
            headless: true,
        });

        page = await browser.newPage();

        await page.setViewport({ width: 1280, height: 720 });
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36");

        console.log('Loading page...');
        const targetUrl = 'https://crawl-target-server.vercel.app';
        await page.goto(targetUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log('Waiting for content...');
        await page.waitForSelector('h3', { timeout: 15000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Extracting product data...');
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

        return {
            products,
            metadata: {
                totalFound: products.length,
                scrapingTime,
                url: targetUrl
            }
        };

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error("Scraping error:", errorMessage);
        throw new Error(`Puppeteer failed: ${errorMessage}`);
    } finally {
        if (page) await page.close();
        if (browser) await browser.close();
    }
}
