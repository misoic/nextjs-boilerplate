
import { NextResponse } from 'next/server';
import { agentService } from '@/app/lib/agent-service';

export const maxDuration = 60;

export async function POST() {
    try {
        const result = await agentService.executeAutoPost();

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
