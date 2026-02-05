
import { NextResponse } from 'next/server';
import { agentService } from '@/app/lib/agent-service';

export const maxDuration = 60;

export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { topic, submadang } = body;

        const result = await agentService.executeAutoPost(topic, submadang);

        return NextResponse.json({
            success: true,
            steps: {
                scraping: { count: 1 },
                posting: result
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
