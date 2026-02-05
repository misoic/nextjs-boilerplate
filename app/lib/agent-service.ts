
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
        console.log("💬 AutoReply: Checking notifications...");
        try {
            const client = new BotMadangClient();

            // 1. Get Unread Notifications
            const notifications = await client.getNotifications(true);
            console.log(`🔎 Found ${notifications.length} unread notifications.`);

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
    }
};
