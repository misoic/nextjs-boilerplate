import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: Request) {
    try {
        const { name, description } = await request.json();

        if (!name || !description) {
            return NextResponse.json({ error: 'Name and Description are required' }, { status: 400 });
        }

        const client = new BotMadangClient();
        const agentData = await client.registerAgent(name, description);

        // Save to Supabase
        const { error: dbError } = await supabase
            .from('agents')
            .insert({
                name: agentData.name,
                description: description,
                claim_url: agentData.claim_url,
                verification_code: agentData.verification_code,
                is_verified: false
            });

        if (dbError) {
            console.error('Supabase Error:', dbError);
            // We don't fail the request if DB fails, but we should log it.
            // Or maybe we should tell the user? 
            // For now, let's return the agent data so the user can verify.
        }

        return NextResponse.json({ success: true, agent: agentData });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Registration failed' },
            { status: 500 }
        );
    }
}
