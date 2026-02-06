import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';

export const dynamic = 'force-dynamic'; // Ensure no caching

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const includePosts = searchParams.get('include_posts') === 'true';

        let apiKey = process.env.BOTMADANG_API_KEY;

        // ... (API Key logic remains same)

        // If no env key, try to find one in Supabase
        if (!apiKey) {
            const { supabase } = await import('@/app/lib/supabase');
            const { data: agent } = await supabase
                .from('agents')
                .select('api_key')
                .eq('is_verified', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();
            if (agent && agent.api_key) apiKey = agent.api_key;
        }

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'No active agent found' }, { status: 401 });
        }

        const client = new BotMadangClient({ apiKey });

        // 1. Get Me (Required)
        const me = await client.getMe();

        // 2. Fetch based on params
        const promises: Promise<any>[] = [client.getGlobalStats()];
        if (includePosts) {
            promises.push(client.getAgentPosts(me.id, 10)); // Limit reduced to 10
        }

        const results = await Promise.all(promises);
        const globalStats = results[0];
        const myPosts = includePosts ? results[1] : [];

        // Sync to Local DB (Supabase) if posts were fetched
        if (includePosts && myPosts.length > 0) {
            try {
                const { supabase } = await import('@/app/lib/supabase');

                // Upsert posts to bot_posts table
                const postsToUpsert = myPosts.map((p: any) => {
                    const postData: any = {
                        id: p.id.toString(), // Ensure ID is string
                        local_id: undefined, // Let DB handle serial
                        title: p.title,
                        submadang: p.submadang,
                        author_id: p.author.id,
                        author_name: p.author.display_name || p.author.username,
                        upvotes: p.upvotes,
                        downvotes: p.downvotes,
                        comment_count: p.comment_count,
                        is_own_post: true, // These are MY posts
                        created_at: p.created_at,
                        collected_at: new Date().toISOString()
                    };

                    // Only update content if API provides it (prevent overwriting local content with null)
                    if (p.content) {
                        postData.content = p.content;
                    }

                    return postData;
                });

                const { error } = await supabase
                    .from('bot_posts')
                    .upsert(postsToUpsert, { onConflict: 'id' });

                if (error) {
                    console.error("Failed to sync posts to DB:", error.message);
                } else {
                    console.log(`✅ Synced ${myPosts.length} posts to local DB`);
                }

            } catch (dbError: any) {
                console.error("Error during DB sync:", dbError.message);
            }
        }

        // 3. Fetch "Real" Posts from Local DB (to get content)
        // Even if we didn't sync (includePosts=false), if we have posts in DB, we might want to return them?
        // But dashboard is designed to return what was requested.
        // If includePosts=true, we return the DB version.

        let finalPosts: any[] = [];
        if (includePosts) {
            try {
                const { supabase } = await import('@/app/lib/supabase');
                const { data: dbPosts, error } = await supabase
                    .from('bot_posts')
                    .select('*')
                    .eq('author_id', me.id)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (!error && dbPosts) {
                    finalPosts = dbPosts.map(p => ({
                        id: Number(p.id),
                        title: p.title,
                        content: p.content, // Content should be here now!
                        created_at: p.created_at,
                        submadang: p.submadang,
                        author_name: p.author_name,
                        upvotes: p.upvotes,
                        downvotes: p.downvotes,
                        comment_count: p.comment_count
                    }));
                } else {
                    console.warn("Failed to fetch from local DB, falling back to API (no content)");
                    finalPosts = myPosts.map((p: any) => ({
                        id: Number(p.id),
                        title: p.title,
                        content: p.content, // Likely undefined
                        created_at: p.created_at,
                        submadang: p.submadang,
                        author_name: p.author.display_name || p.author.username,
                        upvotes: p.upvotes,
                        downvotes: p.downvotes,
                        comment_count: p.comment_count
                    }));
                }

            } catch (e) {
                console.error("Error fetching local posts:", e);
                // Fallback
                finalPosts = myPosts;
            }
        }


        // 4. Get Queue Stats
        const { queueService } = await import('@/app/lib/queue-service');
        const queueStats = await queueService.getStats();

        return NextResponse.json({
            success: true,
            data: {
                agent: me,
                myPostsCount: finalPosts.length, // Update count based on actual return
                myPosts: finalPosts, // Return local DB posts
                globalStats,
                queueStats, // { total, pending }
                nextDraft: await queueService.peek('post_draft')
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
