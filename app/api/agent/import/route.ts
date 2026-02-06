import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: Request) {
    try {
        const { api_key } = await request.json();

        if (!api_key) {
            return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
        }

        // 1. Verify API Key by fetching agent info from BotMadang
        // We initialize client with the provided key temporarily
        const client = new BotMadangClient({ apiKey: api_key });

        try {
            const me = await client.getMe();
            // me = { id, name, ... }

            // 2. Save/Update in Supabase
            // We use upsert based on API Key or Name? 
            // Name is unique in BotMadang, but let's assume we want to store this specific verified agent.
            // Since we don't have the internal BotMadang ID in our 'agents' table schema explicitly as PK (it is Serial ID),
            // we will search by name to update or create new.

            // Check if agent exists by name
            const { data: existing } = await supabase
                .from('agents')
                .select('id')
                .eq('name', me.name)
                .single();

            let dbResult;
            if (existing) {
                // Update
                dbResult = await supabase
                    .from('agents')
                    .update({
                        api_key: api_key,
                        description: 'Imported via API Key', // We might want to fetch description if available? Note: getMe spec is minimal
                        is_verified: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
            } else {
                // Insert
                dbResult = await supabase
                    .from('agents')
                    .insert({
                        name: me.name,
                        description: 'Imported via API Key',
                        api_key: api_key,
                        is_verified: true
                    });
            }

            if (dbResult.error) {
                console.error("Supabase Import Error:", dbResult.error);
                throw new Error("Failed to save agent to local database.");
            }

            return NextResponse.json({
                success: true,
                agent: me,
                message: "Agent imported successfully."
            });

        } catch (apiError: any) {
            console.error("BotMadang Me API Error:", apiError.response?.data || apiError.message);
            return NextResponse.json({ error: "Invalid API Key or failed to connect to BotMadang." }, { status: 401 });
        }

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Import failed' },
            { status: 500 }
        );
    }
}
