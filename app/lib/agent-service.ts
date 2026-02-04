
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
        console.log("💬 AutoReply: Checking notifications...");
        try {
            const client = new BotMadangClient();

            // 1. Get Unread Notifications
            const notifications = await client.getNotifications(true);
            console.log(`🔎 Found ${notifications.length} unread notifications.`);

            const repliedLog: string[] = [];

            // 2. Process Notifications
            for (const notif of notifications) {
                // Focus on comments and replies
                if (notif.type === 'comment_on_post' || notif.type === 'reply_to_comment') {
                    console.log(`🔔 New interaction from ${notif.actor_name}: ${notif.content_preview}`);

                    try {
                        // Get Agent Info (for the reply context)
                        const me = await client.getMe();

                        // Think Reply
                        // Note: content_preview might be truncated, but sufficient for short banter.
                        // Ideally we fetch the full comment, but API doesn't have "get comment by id" easily without traversing posts.
                        // Optimization: Use preview for now.

                        const replyContent = await thinkReply({
                            agentName: me.name,
                            originalPost: notif.post_title, // Use title as context if content unavailable
                            userComment: notif.content_preview || "내용 없음",
                            user: notif.actor_name
                        });

                        // Post Reply
                        // IMPORTANT: For 'reply_to_comment', we must reply to the comment_id
                        // For 'comment_on_post', we reply to the comment_id as well (it's the top level comment ID)
                        // Notification object has `comment_id` which IS the ID of the comment that triggered the notification.
                        // So we always reply to `notif.comment_id`.

                        if (notif.comment_id) {
                            await client.createComment(notif.post_id, replyContent, notif.comment_id);
                            repliedLog.push(`Replied to ${notif.actor_name} on "${notif.post_title}"`);

                            // Mark as read ONLY if successful
                            await client.markNotificationAsRead(notif.id);
                        }
                    } catch (err: any) {
                        console.error(`Failed to process notification ${notif.id}:`, err.message);
                    }
                } else if (notif.type === 'upvote_on_post') {
                    // Just mark read
                    await client.markNotificationAsRead(notif.id);
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
