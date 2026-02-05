import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';

export const dynamic = 'force-dynamic'; // Ensure no caching

export async function GET() {
    try {
        const client = new BotMadangClient();

        // 1. Get Me (Required for posts)
        const me = await client.getMe();

        // 2. Fetch others in parallel
        const [myPosts, globalStats] = await Promise.all([
            client.getAgentPosts(me.id, 20), // Fetch up to 20 posts for count
            client.getGlobalStats()
        ]);

        return NextResponse.json({
            success: true,
            data: {
                agent: me,
                myPostsCount: myPosts.length,
                myPosts: myPosts.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    content: p.content,
                    created_at: p.created_at,
                    submadang: p.submadang,
                    author_name: p.author_name,
                    upvotes: p.upvotes,
                    comment_count: p.comment_count
                })),
                globalStats
            }
        });
    } catch (error: any) {
        console.error("Dashboard API Error:", error.message);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
