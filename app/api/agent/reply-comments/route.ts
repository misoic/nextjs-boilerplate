
import { NextResponse } from 'next/server';
import { BotMadangClient, Post } from '@/app/lib/botmadang';
import { thinkReply } from '@/app/lib/brain';

export async function POST() {
    try {
        const client = new BotMadangClient();

        // 1. Get Me (to filter my posts and check my replies)
        const me = await client.getMe();
        if (!me) throw new Error("Could not fetch agent info");

        console.log(`🔎 Checking comments for Agent: ${me.name} (${me.id})`);

        // 2. Get My Posts (fetch 50 to cover recent activity)
        const allPosts = await client.getPosts(50);
        // The API returns ALL posts. We verify author.id.
        // Wait, 'author.id' from API might need verification. 
        // Based on BotMadangClient interface: author: { id: string }
        const myPosts = allPosts.filter(p => p.author && p.author.id === me.id);

        console.log(`found ${myPosts.length} posts by me.`);

        const repliedLog: string[] = [];

        // 3. Check each post for comments
        for (const post of myPosts) {
            // Optimization: if comment_count == 0, skip
            if (post.comment_count === 0) continue;

            const comments = await client.getComments(String(post.id));

            // 4. Find valid comments to reply to
            // Logic: The comment is NOT mine, and it is NOT followed by a reply from ME.
            // Assumption: Comments are chronological (oldest first? or newest first?).
            // Usually APIs return oldest first or newest first. 
            // If we assume a flat list, we need to know the order.
            // Let's assume standard BotMadang behavior (usually chronological).

            // Simple robust logic:
            // Group comments by user? No, simple thread.
            // Just look at the LAST comment. 
            // If the LAST comment is NOT by me, I should reply.
            // (This keeps the conversation 1-to-1 ping pong).

            if (comments.length === 0) continue;

            const lastComment = comments[comments.length - 1]; // Assuming array is chronological

            // Check if author exists (deleted user?)
            if (!lastComment.author) continue;

            if (lastComment.author.id !== me.id) {
                // The last word was not mine! I must reply!
                const userName = lastComment.author.display_name || lastComment.author.username || "익명";
                console.log(`💬 Found unreplied comment on post "${post.title}" by ${userName}`);

                // 5. Think Reply
                const replyContent = await thinkReply({
                    agentName: me.name,
                    originalPost: post.content,
                    userComment: lastComment.content,
                    user: userName
                });

                // 6. Post Reply
                await client.createComment(String(post.id), replyContent);
                repliedLog.push(`Replied to ${lastComment.author.username} on "${post.title}"`);
            }
        }

        return NextResponse.json({
            success: true,
            repliedCount: repliedLog.length,
            logs: repliedLog
        });

    } catch (error: any) {
        console.error("Reply Loop Failed:", error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}
