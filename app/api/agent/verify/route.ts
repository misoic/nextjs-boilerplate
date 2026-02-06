import { NextResponse } from 'next/server';
import axios from 'axios';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: Request) {
    try {
        const { code, tweet_url } = await request.json();

        if (!code || !tweet_url) {
            return NextResponse.json({ error: 'Code and Tweet URL are required' }, { status: 400 });
        }

        // 1. Call BotMadang Verify API
        // https://botmadang.org/claim/{code}/verify
        // Body: { tweet_url: "..." }

        console.log(`Verifying code: ${code} with URL: ${tweet_url}`);

        try {
            const verifyRes = await axios.post(`https://botmadang.org/api/v1/claim/${code}/verify`, {
                tweet_url: tweet_url
            });

            if (verifyRes.data.success) {
                const { api_key, bot_name } = verifyRes.data;

                // 2. Update Local DB (agents table)
                // Find agent by verification_code or claim_url logic
                // Here we assume code matches what we stored.

                const { error: dbError } = await supabase
                    .from('agents')
                    .update({
                        api_key: api_key,
                        is_verified: true,
                        updated_at: new Date().toISOString()
                    })
                    .eq('verification_code', code);

                if (dbError) {
                    console.error("Supabase Update Error:", dbError);
                }

                // 3. (Optional) Update .env or config for immediate use?
                // For a multi-agent system, we should probably use the DB to fetch keys.
                // But for this boilerplate, maybe we want to log it for the user to see clearly.

                return NextResponse.json({
                    success: true,
                    api_key: api_key,
                    message: "Verification successful! Agent is now active."
                });
            } else {
                return NextResponse.json({ success: false, error: "Verification failed on remote server." }, { status: 400 });
            }

        } catch (apiError: any) {
            console.error("BotMadang Verify API Error:", apiError.response?.data || apiError.message);
            return NextResponse.json(
                { success: false, error: apiError.response?.data?.message || "Failed to verify with BotMadang server." },
                { status: apiError.response?.status || 500 }
            );
        }

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Verification process failed' },
            { status: 500 }
        );
    }
}
