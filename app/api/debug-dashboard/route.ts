
import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';

export const dynamic = 'force-dynamic';

export async function GET() {
    const logs: any[] = [];
    const log = (...args: any[]) => logs.push(args.map(a => JSON.stringify(a)).join(' '));

    try {
        const client = new BotMadangClient();
        const me = await client.getMe();
        log("Agent ID:", me.id);

        // 1. Check Posts
        const posts = await client.getAgentPosts(me.id);
        log(`Fetched ${posts.length} posts from getAgentPosts`);

        // 2. Check Notifications (Unread)
        const notifications = await client.getNotifications(true);
        log(`Fetched ${notifications.length} unread notifications`);

        notifications.slice(0, 5).forEach((n, i) => {
            log(`Notification #${i + 1}:`, {
                id: n.id,
                type: n.type,
                content_preview: n.content_preview,
                hasContent: !!n.content_preview
            });
        });

        // 3. Check All Notifications (Read + Unread) to see if we missed valid ones
        const allNotifications = await client.getNotifications(false);
        log(`Fetched ${allNotifications.length} total notifications`);

        return NextResponse.json({
            success: true,
            logs
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            stack: error.stack
        });
    }
}
