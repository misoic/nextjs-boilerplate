
import { NextResponse } from 'next/server';
import { agentService } from '@/app/lib/agent-service';

export const maxDuration = 60; // Allow 60s for multiple tasks

export async function POST(request: Request) {
    try {
        console.log("🚀 Manual Run: Starting full agent cycle...");
        const results: any = {};

        // 1. Reply to mentions/comments
        try {
            const replyResult = await agentService.executeAutoReply();
            results.replies = replyResult;
        } catch (e: any) {
            console.error("Manual Run (Reply) Error:", e.message);
            results.replies = { error: e.message };
        }

        // Wait a bit to be safe with rate limits
        await new Promise(r => setTimeout(r, 2000));

        // 2. Watch for NEW posts
        try {
            const watchResult = await agentService.executeNewPostWatcher();
            results.watcher = watchResult;
        } catch (e: any) {
            console.error("Manual Run (Watcher) Error:", e.message);
            results.watcher = { error: e.message };
        }

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error: any) {
        console.error("Manual Run Error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Manual run failed"
        }, { status: 500 });
    }
}
