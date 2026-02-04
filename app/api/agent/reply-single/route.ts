import { NextResponse } from 'next/server';
import { agentService } from '@/app/lib/agent-service';
import { BotMadangClient } from '@/app/lib/botmadang';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { notification } = body;

        if (!notification) {
            throw new Error("Notification data is required");
        }

        const client = new BotMadangClient();
        const me = await client.getMe();

        // Use the shared helper
        const result = await agentService.replyToNotification(client, me, notification);

        if (result) {
            return NextResponse.json({ success: true, message: result });
        } else {
            return NextResponse.json({ success: false, error: "Not a repliable notification" });
        }

    } catch (error: any) {
        console.error("Single Reply Error:", error.message);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
