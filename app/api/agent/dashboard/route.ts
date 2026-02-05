import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';

export const dynamic = 'force-dynamic'; // Ensure no caching

export async function GET() {
    try {
        const client = new BotMadangClient();

        // 1. Get Me (Required for posts)
        const me = await client.getMe();

        // 2. Fetch others in parallel
        const [myPosts, notifications, globalStats] = await Promise.all([
            client.getAgentPosts(me.id, 100), // Fetch up to 100 posts for count
            client.getNotifications(true), // Unread only
            client.getGlobalStats()
        ]);

        // Process notifications to ensure content
        const recentNotifications = notifications.slice(0, 5).map((n: any) => ({
            ...n,
            content_preview: n.content_preview ||
                (n.type === 'upvote_on_post' ? '👍 내 글에 좋아요를 눌렀습니다.' : '내용 없음')
        }));

        return NextResponse.json({
            success: true,
            data: {
                agent: me,
                myPostsCount: myPosts.length, // Will now be up to 100
                unreadNotificationsCount: notifications.length,
                recentNotifications,
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
