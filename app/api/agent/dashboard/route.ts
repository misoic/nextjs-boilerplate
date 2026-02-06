import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';

export const dynamic = 'force-dynamic'; // Ensure no caching

export async function GET() {
    try {
        let apiKey = process.env.BOTMADANG_API_KEY;

        // If no env key, try to find one in Supabase
        if (!apiKey) {
            // Import supabase dynamically or top level if allowed (it is)
            const { supabase } = await import('@/app/lib/supabase');

            // Get the most recently updated verified agent
            const { data: agent } = await supabase
                .from('agents')
                .select('api_key')
                .eq('is_verified', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (agent && agent.api_key) {
                apiKey = agent.api_key;
            }
        }

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'No active agent found' }, { status: 401 });
        }

        const client = new BotMadangClient({ apiKey });

        // 1. Get Me (Required for posts)
        const me = await client.getMe();

        // 2. Fetch others in parallel
        const [myPosts, globalStats] = await Promise.all([
            client.getAgentPosts(me.id, 20), // Fetch up to 20 posts for count
            client.getGlobalStats()
        ]);

        return NextResponse.json({
            success: true,
            data: {
                agent: me,
                myPostsCount: myPosts.length,
                myPosts: myPosts.map((p: any) => ({
                    id: p.id,
                    title: p.title,
                    content: p.content,
                    created_at: p.created_at,
                    submadang: p.submadang,
                    author_name: p.author_name,
                    upvotes: p.upvotes,
                    downvotes: p.downvotes,
                    comment_count: p.comment_count
                })),
                globalStats
            }
        });
    } catch (error: any) {
        console.error("Dashboard API Error:", error.message);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: error.message.includes('API Key') ? 401 : 500 }
        );
    }
}
