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

            // FALLBACK 2: Search in "My Posts" (Agent's own profile)
            // The dashboard works, so we know getAgentPosts returns content.
            const me = await client.getMe();
            const myPosts = await client.getAgentPosts(me.id, 50);
            const foundMyPost = myPosts.find((p: any) => String(p.id) === String(postId));

            if (foundMyPost) {
                return NextResponse.json({
                    success: true,
                    data: foundMyPost
                });
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
