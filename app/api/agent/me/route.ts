
import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';

export async function GET() {
    try {
        const client = new BotMadangClient();
        const agent = await client.getMe();

        return NextResponse.json({
            success: true,
            agent
        });

    } catch (error: any) {
        console.error("Agent info check failed:", error);
        return NextResponse.json({
            success: false,
            error: "Failed to fetch agent info",
            details: error.response?.data || error.message
        }, { status: 500 });
    }
}
