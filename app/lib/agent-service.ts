
import { BotMadangClient } from './botmadang';
import { thinkAndWrite, thinkReply } from './brain';

export const agentService = {
    /**
     * Executes the autonomous post workflow
     */
    async executeAutoPost(topic?: string, submadang: string = 'general') {
        console.log("🤖 AutoPost: Agent is waking up...");
        try {
            const client = new BotMadangClient();

            // 1. Get Agent Info
            const agent = await client.getMe();
            console.log(`🤖 AutoPost: Acting as ${agent.name}`);

            // 2. Think
            console.log("🧠 AutoPost: Thinking...");
            const thought = await thinkAndWrite(agent.name, topic);

            // 3. Post
            console.log(`📝 AutoPost: Posting topic "${thought.topic}" to ${submadang}...`);
            const post = await client.createPost(
                thought.title || "무제",
                thought.content || "내용 없음",
                submadang
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
            if (error.message.includes('Max retries exceeded') || error.message.includes('Failed to think')) {
                throw new Error("AI가 잠시 휴식 중입니다. 30초 뒤에 다시 시도해주세요! 🤯");
            }
            throw error;
        }
    },

    /**
     * Helper to process a single notification reply
     */
    async replyToNotification(client: BotMadangClient, me: any, notif: any) {
        if (notif.type !== 'comment_on_post' && notif.type !== 'reply_to_comment') return null;

        console.log(`🔔 Processing notification from ${notif.actor_name}: ${notif.content_preview}`);

        try {
            // Think Reply
            const replyContent = await thinkReply({
                agentName: me.name,
                originalPost: notif.post_title,
                userComment: notif.content_preview || "내용 없음",
                user: notif.actor_name
            });

            // Post Reply
            if (notif.comment_id) {
                await client.createComment(notif.post_id, replyContent, notif.comment_id);
                // Mark as read ONLY if successful
                await client.markNotificationAsRead(notif.id);
                return `Replied to ${notif.actor_name} on "${notif.post_title}"`;
            }
        } catch (err: any) {
            console.error(`Failed to process notification ${notif.id}:`, err.message);
            throw err; // Re-throw to handle upstream
        }
        return null;
    },

    /**
     * Executes the comment reply workflow
     */
    async executeAutoReply() {
        // console.log("💬 AutoReply: Checking notifications...");
        try {
            const client = new BotMadangClient();

            // 1. Get Unread Notifications
            // 1. Get Unread Notifications
            const notifications = await client.getNotifications(true);
            if (notifications.length > 0) {
                console.log(`🔎 Found ${notifications.length} unread notifications.`);
            }

            const repliedLog: string[] = [];

            // 1.5 Get Me (once)
            const me = await client.getMe();

            // 2. Process Notifications with Throttling
            // 2. Process Notifications with Throttling
            for (const notif of notifications) {
                try {
                    const result = await this.replyToNotification(client, me, notif);
                    if (result) {
                        repliedLog.push(result);
                        console.log(`✅ ${result}`);

                        // THROTTLING: Wait longer to avoid 429
                        // (Only wait if it's not the last one)
                        if (notif !== notifications[notifications.length - 1]) {
                            console.log("⏳ Waiting 15s for rate limit...");
                            await new Promise(resolve => setTimeout(resolve, 15000));
                        }
                    } else if (notif.type === 'upvote_on_post') {
                        await client.markNotificationAsRead(notif.id);
                    }
                } catch (error: any) {
                    // DUPLICATE COMMENT HANDLING
                    if (error.response?.data?.error?.includes('이미 동일한 댓글') ||
                        error.message?.includes('동일한 댓글')) {
                        console.warn(`⚠️ Duplicate comment detected for ${notif.id}. Marking as read.`);
                        await client.markNotificationAsRead(notif.id);
                        continue;
                    }
                    console.error(`Skipping notification ${notif.id} due to error:`, error.message);
                }
            }

            console.log(`✅ AutoReply: Processed ${repliedLog.length} interactions.`);
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
    },

    /**
     * Watches for NEW posts and comments on them
     */
    async executeNewPostWatcher() {
        if (process.env.NEXT_RUNTIME !== 'nodejs') return;

        const fs = await import('fs');
        const path = await import('path');
        const STATE_FILE = path.join(process.cwd(), 'agent_state.json');

        console.log("👀 NewPostWatcher: Checking for new posts...");
        try {
            const client = new BotMadangClient();
            const me = await client.getMe();
            const posts = await client.getPosts(20); // Get recent 20

            if (posts.length === 0) return;

            // 1. Load State
            let lastSeenId = '';
            if (fs.existsSync(STATE_FILE)) {
                try {
                    const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
                    lastSeenId = state.last_seen_post_id;
                } catch (e) { console.error("State load failed", e); }
            }

            // 2. Initialize State if First Run
            if (!lastSeenId) {
                console.log("✨ First run: Marking latest post as baseline.");
                const latestId = posts[0].id;
                fs.writeFileSync(STATE_FILE, JSON.stringify({ last_seen_post_id: latestId }));
                return;
            }

            // 3. Find New Posts
            // 3. Find New Posts
            const newPosts: any[] = [];
            for (const post of posts) {
                // Fix: Compare as strings to avoid type mismatch (number vs string)
                if (String(post.id) === String(lastSeenId)) break;
                if (post.author.id === me.id) continue; // Skip my own posts
                newPosts.push(post);
            }

            if (newPosts.length === 0) {
                console.log("💤 No new posts.");
                return;
            }

            console.log(`🚀 Found ${newPosts.length} NEW posts!`);

            // Process Oldest First (Reverse the array)
            const postsToProcess = newPosts.reverse();

            // 4. Comment on them
            let processedCount = 0;
            for (const post of postsToProcess) {
                try {
                    console.log(`💬 Commenting on new post: "${post.title}" by ${post.author.display_name}`);

                    // Think
                    const commentContent = await thinkReply({
                        agentName: me.name,
                        originalPost: post.title + "\n" + post.content,
                        userComment: "새로운 글이 올라왔습니다. 반응해주세요.", // Context prompt
                        user: post.author.display_name
                    });

                    // Post Comment
                    await client.createComment(post.id, commentContent);
                    console.log(`✅ Commented on post ${post.id}`);
                    processedCount++;

                    // Update State immediately to avoid re-processing if crash
                    fs.writeFileSync(STATE_FILE, JSON.stringify({ last_seen_post_id: post.id }));

                    // Throttling
                    if (post !== postsToProcess[postsToProcess.length - 1]) {
                        console.log("⏳ Waiting 15s...");
                        await new Promise(r => setTimeout(r, 15000));
                    }

                } catch (e: any) {
                    console.error(`Failed to comment on ${post.id}:`, e.message);
                }
            }

            return { success: true, processedCount };

        } catch (error: any) {
            console.error("NewPostWatcher Error:", error.message);
        }
    }
};
