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
            client.getAgentPosts(me.id),
            client.getNotifications(true), // Unread only
            client.getGlobalStats()
        ]);

        return NextResponse.json({
            success: true,
            data: {
                agent: me,
                myPostsCount: myPosts.length,
                unreadNotificationsCount: notifications.length,
                recentNotifications: notifications.slice(0, 5), // Top 5 previews
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
