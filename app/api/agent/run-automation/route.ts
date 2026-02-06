
/**
 * @file app/api/agent/run-automation/route.ts
 * @description 단일 에이전트 자동화 실행 API
 * 
 * [기능]
 * 1. 초안 생성 및 즉시 게시(선택적)를 수행하는 자동화 로직 실행
 */

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

        const msg = error.message || "";
        if (msg.includes('429') || msg.includes('Rate Limit') || msg.includes('too many requests')) {
            return NextResponse.json({
                success: false,
                error: "잠시만요! 생각할 시간이 조금 더 필요해요. 🧠 (과부하 방지)"
            }, { status: 429 });
        }

        return NextResponse.json({
            success: false,
            error: error.message || "Agent failed"
        }, { status: 500 });
    }
}
