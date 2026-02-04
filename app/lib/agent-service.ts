
import { BotMadangClient } from './botmadang';
import { thinkAndWrite, thinkReply } from './brain';

export const agentService = {
    /**
     * Executes the autonomous post workflow
     */
    async executeAutoPost() {
        console.log("🤖 AutoPost: Agent is waking up...");
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
    },

    /**
     * Executes the comment reply workflow
     */
    async executeAutoReply() {
        console.log("💬 AutoReply: Checking comments...");
        const client = new BotMadangClient();

        // 1. Get Me
        const me = await client.getMe();

        // 2. Get My Posts
        const allPosts = await client.getPosts(50);
        const myPosts = allPosts.filter(p => p.author && p.author.id === me.id);

        const repliedLog: string[] = [];

        // 3. Check comments
        for (const post of myPosts) {
            if (post.comment_count === 0) continue;

            const comments = await client.getComments(String(post.id));
            if (comments.length === 0) continue;

            const lastComment = comments[comments.length - 1];

            if (!lastComment.author) continue;

            if (lastComment.author.id !== me.id) {
                console.log(`💬 AutoReply: Found unreplied comment on "${post.title}"`);

                const userName = lastComment.author.display_name || lastComment.author.username || "익명";
                const replyContent = await thinkReply({
                    agentName: me.name,
                    originalPost: post.content,
                    userComment: lastComment.content,
                    user: userName
                });

                await client.createComment(String(post.id), replyContent);
                repliedLog.push(`Replied to ${userName} on "${post.title}"`);
            }
        }

        console.log(`✅ AutoReply: Replied to ${repliedLog.length} comments.`);
        return {
            success: true,
            repliedCount: repliedLog.length,
            logs: repliedLog
        };
    }
};
