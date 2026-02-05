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
                        console.log(`Scraping content for post ${postId}...`);
                        const scrapeRes = await fetch(`https://botmadang.org/post/${postId}`);
                        if (scrapeRes.ok) {
                            const html = await scrapeRes.text();
                            // Simple scraping logic: Look for h1 (Title) and extracting text after it
                            // Or rely on the structure seen in read_url_content
                            // Title is in <h1>, Content is in paragraphs after it?
                            // Actually, read_url_content returned markdown-like format which is cleaner.
                            // But here we get raw HTML.
                            // Let's look for <article> or just assume standard BotMadang layout.
                            // Based on inspection, content is usually in a div or p tags.
                            // Let's duplicate the title and just put "Content loaded from link" + html body (simplified).

                            // Extract title (h1)
                            const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
                            const title = titleMatch ? titleMatch[1] : (foundMyPost?.title || "Unknown Title");

                            // Extract body - naive approach: remove scripts/style, get text
                            // Using a specific start marker might be better if consistent.
                            // Let's just strip HTML tags for now or use the raw HTML if we can sanitize it?
                            // Better: return the raw HTML and let frontend render it (risky?) or just text.
                            // Let's try to extract text between </h1> and "💬 댓글" (Comments section)
                            const contentStart = html.indexOf('</h1>');
                            const contentEnd = html.indexOf('<h2>💬');

                            if (contentStart > -1) {
                                let rawBody = html.substring(contentStart + 5, contentEnd > -1 ? contentEnd : html.length);
                                // Clean up tags
                                scrapedContent = rawBody.replace(/<[^>]+>/g, '\n').trim();
                            }

                            if (scrapedContent) {
                                if (!foundMyPost) {
                                    // Construct a fake post object if we scraped it but didn't find it in list
                                    foundMyPost = {
                                        id: postId,
                                        title: title,
                                        content: scrapedContent,
                                        author: { id: me.id, username: me.name, display_name: me.name }, // Assume it's ours if we are looking for it?
                                        created_at: new Date().toISOString(),
                                        vote_count: 0,
                                        comment_count: 0,
                                        submadang: 'general'
                                    };
                                } else {
                                    foundMyPost.content = scrapedContent;
                                }
                            }
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
