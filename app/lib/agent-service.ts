
import { BotMadangClient } from './botmadang';
import { thinkAndWrite, thinkReply } from './brain';

export const agentService = {
    /**
     * Executes the autonomous post workflow
     */
    async executeAutoPost() {
        console.log("🤖 AutoPost: Agent is waking up...");
        try {
            const client = new BotMadangClient();

            // 1. Get Agent Info
            const agent = await client.getMe();
            console.log(`🤖 AutoPost: Acting as ${agent.name}`);

            // 2. Think
            console.log("🧠 AutoPost: Thinking...");
            const thought = await thinkAndWrite(agent.name);

            // 3. Post
            console.log(`📝 AutoPost: Posting topic "${thought.topic}"...`);
            const post = await client.createPost(
                thought.title || "무제",
                thought.content || "내용 없음",
                'general'
            );

            return {
                success: true,
                topic: thought.topic,
                postId: post.id
            };
        } catch (error: any) {
            console.error("AutoPost Error:", error);
            if (error.response?.status === 429) {
                throw new Error("너무 빠른 요청입니다. 잠시 후 다시 시도해주세요. (Rate Limit Exceeded)");
            }
            throw error;
        }
    },

    /**
     * Executes the comment reply workflow
     */
    async executeAutoReply() {
        console.log("💬 AutoReply: Checking comments...");
        try {
            const client = new BotMadangClient();

            // 1. Get Me
            const me = await client.getMe();

            // 2. Get My Posts (Fetch direct agent posts to avoid missing older ones)
            console.log(`🔎 AutoReply: Fetching posts for Agent ${me.id}...`);
            const myPosts = await client.getAgentPosts(me.id);
            console.log(`   Found ${myPosts.length} posts.`);

            const repliedLog: string[] = [];

            // 3. Check comments
            for (const post of myPosts) {
                if (post.comment_count === 0) continue;

                const comments = await client.getComments(String(post.id));
                if (comments.length === 0) continue;

                const lastComment = comments[comments.length - 1];

                // Support both nested and flattened structure (API inconsistency)
                const authorId = lastComment.author?.id || lastComment.author_id;
                const authorName = lastComment.author?.display_name || lastComment.author?.username || lastComment.author_name || "익명";

                // If we can't find author ID, skip safety check (or skip processing)
                if (!authorId) continue;

                if (authorId !== me.id) {
                    console.log(`💬 AutoReply: Found unreplied comment on "${post.title}" by ${authorName}`);

                    const replyContent = await thinkReply({
                        agentName: me.name,
                        originalPost: post.content,
                        userComment: lastComment.content,
                        user: authorName
                    });

                    // Use nested reply (pass comment ID as parent_id)
                    await client.createComment(String(post.id), replyContent, String(lastComment.id));
                    repliedLog.push(`Replied to ${authorName} on "${post.title}" (Nested)`);
                }
            }

            console.log(`✅ AutoReply: Replied to ${repliedLog.length} comments.`);
            return {
                success: true,
                repliedCount: repliedLog.length,
                logs: repliedLog
            };
        } catch (error: any) {
            console.error("AutoReply Error:", error);
            if (error.response?.status === 429) {
                throw new Error("너무 빠른 요청입니다. 잠시 후 다시 시도해주세요. (Rate Limit Exceeded)");
            }
            throw error;
        }
    }
};
