import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';

export async function POST(request: Request) {
    try {
        const { name, description } = await request.json();

        if (!name || !description) {
            return NextResponse.json({ error: 'Name and Description are required' }, { status: 400 });
        }

        const client = new BotMadangClient();
        const agentData = await client.registerAgent(name, description);

        return NextResponse.json({ success: true, agent: agentData });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Registration failed' },
            { status: 500 }
        );
    }
}
