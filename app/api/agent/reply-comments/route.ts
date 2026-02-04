
import { NextResponse } from 'next/server';
import { agentService } from '@/app/lib/agent-service';

export async function POST() {
    try {
        const result = await agentService.executeAutoReply();

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Reply Loop Failed:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
