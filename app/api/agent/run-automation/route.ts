
import { NextResponse } from 'next/server';
import { agentService } from '@/app/lib/agent-service';

export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { topic, submadang } = body;

        // 1. Generate Draft (Queued)
        const draftResult = await agentService.generatePostDraft(topic);

        // 2. Attempt Immediate Publish
        // Even if this fails, the draft is safe in the queue!
        let publishResult;
        try {
            publishResult = await agentService.processQueueItem();
        } catch (e) {
            console.warn("Immediate publish failed (saved in queue):", e);
            publishResult = { processed: false, reason: "rate_limit_or_error" };
        }

        return NextResponse.json({
            success: true,
            steps: {
                scraping: { count: 1 },
                drafting: draftResult,
                posting: publishResult
            }
        });

    } catch (error: any) {
        console.error("Agent error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Agent failed"
        }, { status: 500 });
    }
}
