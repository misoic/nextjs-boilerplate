import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const postId = searchParams.get('postId');

        if (!postId) {
            return NextResponse.json(
                { success: false, error: 'Missing postId parameter' },
                { status: 400 }
            );
        }

        const client = new BotMadangClient();

        // FALLBACK STRATEGY: 
        // Since GET /posts/:id does not exist, and GET /agents/:id/posts has no content,
        // we try to find the post in the Public Timeline (GET /posts) which DOES have content.
        try {

            const publicPosts = await client.getPosts(50); // Fetch latest 50 posts
            const foundPost = publicPosts.find(p => String(p.id) === String(postId));

            if (foundPost) {

                return NextResponse.json({
                    success: true,
                    data: foundPost
                });
            }


            // FALLBACK 2: Search in "My Posts" (Agent's own profile) -> Check content availability
            const me = await client.getMe();
            try {
                // Try to find post in Agent's profile to get basic meta
                const myPosts = await client.getAgentPosts(me.id, 50);
                let foundMyPost = myPosts.find((p: any) => String(p.id) === String(postId));

                // If found but content is missing/empty, OR if not found at all, try scraping
                let scrapedContent = null;
                if (!foundMyPost || !foundMyPost.content) {
                    try {
                        console.log(`Scraping content for post ${postId} using Puppeteer...`);

                        // Dynamic import to avoid build issues if puppeteer is optional
                        const puppeteer = await import('puppeteer');

                        const browser = await puppeteer.launch({
                            headless: true,
                            args: ['--no-sandbox', '--disable-setuid-sandbox']
                        });

                        try {
                            const page = await browser.newPage();
                            await page.goto(`https://botmadang.org/post/${postId}`, {
                                waitUntil: 'networkidle2',
                                timeout: 10000
                            });

                            // Extract content specifically from the post body
                            // We wait for the h1 to ensure page loads
                            await page.waitForSelector('h1', { timeout: 5000 });

                            // Extract title if we don't have it
                            const pageTitle = await page.$eval('h1', el => el.textContent?.trim());

                            // Extract content - heavily dependent on DOM structure
                            // Strategy: identifying the main content container. 
                            // Common patterns: article tag, or specific classes. 
                            // If ambiguous, we get the text of the main container minus the title and comments.

                            const content = await page.evaluate(() => {
                                // Heuristics for BotMadang structure
                                // Assuming typical Next.js/React structure, often in <main> or <article>
                                const article = document.querySelector('article') || document.querySelector('main');
                                if (!article) return document.body.innerText;

                                // Clone to avoid modifying live DOM
                                const clone = article.cloneNode(true) as HTMLElement;

                                // Remove H1 (title)
                                const h1 = clone.querySelector('h1');
                                if (h1) h1.remove();

                                // Remove Comments section if present
                                // Often marked by "댓글" or specific headers
                                const headers = Array.from(clone.querySelectorAll('h1, h2, h3, h4'));
                                headers.forEach(header => {
                                    if (header.textContent?.includes('댓글') || header.textContent?.includes('Comments')) {
                                        // Remove everything after this header including the header
                                        let curr: Element | null = header;
                                        while (curr) {
                                            const next: Element | null = curr.nextElementSibling;
                                            curr.remove();
                                            curr = next;
                                        }
                                    }
                                });

                                return clone.innerText.trim();
                            });

                            scrapedContent = content;

                            // Log success
                            console.log('Puppeteer scraping successful. Length:', scrapedContent.length);

                            // Construct found object if missing
                            if (!foundMyPost) {
                                foundMyPost = {
                                    id: Number(postId),
                                    title: pageTitle || "Unknown Title",
                                    content: scrapedContent,
                                    author: { id: me.id, username: me.name, display_name: me.name },
                                    created_at: new Date().toISOString(),
                                    vote_count: 0,
                                    comment_count: 0,
                                    submadang: 'general'
                                };
                            } else {
                                foundMyPost.content = scrapedContent;
                            }

                        } catch (pError) {
                            console.error("Puppeteer page error:", pError);
                        } finally {
                            await browser.close();
                        }

                    } catch (scrapeErr) {
                        console.error("Scraping failed:", scrapeErr);
                    }
                }

                if (foundMyPost) {
                    return NextResponse.json({
                        success: true,
                        data: foundMyPost
                    });
                }
            } catch (err) {
                console.error("Fallback search failed:", err);
            }


            return NextResponse.json(
                { success: false, error: 'Content not available (Post not found in recent history)' },
                { status: 404 }
            );

        } catch (error: any) {
            const status = error.response?.status || 500;
            return NextResponse.json(
                { success: false, error: error.message, details: error.response?.data },
                { status: status }
            );
        }
    } catch (error: any) {
        console.error("Post Detail API Error:", error.message);
        const status = error.response?.status || 500;
        const message = error.response?.data?.error || error.message;
        return NextResponse.json(
            { success: false, error: message, details: error.response?.data },
            { status: status }
        );
    }
}
