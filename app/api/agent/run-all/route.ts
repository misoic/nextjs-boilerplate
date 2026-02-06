import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';
import { supabase } from '@/app/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow longer timeout for AI generation

async function generateReply(context: string, authorName: string): Promise<string> {
    try {
        const prompt = `
        You are a friendly and witty AI agent named "BotMadang Agent".
        Someone named "${authorName}" wrote this comment to you: "${context}"
        
        Write a short, engaging reply (in Korean).
        - Be polite but fun.
        - Use emojis if appropriate.
        - Keep it under 200 characters.
        - If they ask a question, try to answer or acknowledge it.
        `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        return response.text().trim();
    } catch (error) {
        console.error("Gemini Generation Error:", error);
        return "댓글 감사합니다! (AI가 잠시 생각에 잠겼어요 🤖)";
    }
}

export async function POST() {
    try {
        // 1. Get Active Agent API Key
        let apiKey = process.env.BOTMADANG_API_KEY;
        if (!apiKey) {
            const { data: agent } = await supabase
                .from('agents')
                .select('api_key')
                .eq('is_verified', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();
            if (agent?.api_key) apiKey = agent.api_key;
        }

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'No verified agent found' }, { status: 401 });
        }

        const client = new BotMadangClient({ apiKey });
        const results = {
            notifications: { processed: 0, new: 0 },
            replies: { generated: 0, sent: 0, errors: 0 }
        };

        // 2. Fetch Unread Notifications
        const notifications = await client.getNotifications(true); // true = unread only
        console.log(`Found ${notifications.length} unread notifications.`);

        for (const notif of notifications) {
            // Check if already processed in DB
            const { data: existing } = await supabase
                .from('bot_notifications')
                .select('id')
                .eq('id', notif.id)
                .single();

            if (existing) {
                // Already processed but maybe not marked read on server?
                // Just mark read to be safe and skip
                await client.markNotificationAsRead(notif.id);
                continue;
            }

            // Save to DB
            await supabase.from('bot_notifications').insert({
                id: notif.id,
                type: notif.type,
                message: notif.content_preview || notif.post_title, // API might vary
                is_read: true, // We are processing it now
                created_at: notif.created_at,
                raw_data: notif
            });
            results.notifications.new++;

            // 3. Auto-Reply Logic
            if (notif.type === 'comment_on_post' || notif.type === 'reply_to_comment') {
                const commentContext = notif.content_preview || "내용 없음";
                const replyContent = await generateReply(commentContext, notif.actor_name || 'User');

                try {
                    // Post reply
                    // Note: Notification usually gives post_id and maybe comment_id
                    // We need to reply to the comment.
                    // If spec says notification has comment_id, use it as parent_id.

                    const parentId = notif.comment_id; // Need to ensure interface has this
                    const postId = notif.post_id;

                    if (postId) {
                        await client.createComment(postId, replyContent, parentId);
                        results.replies.sent++;
                        console.log(`Replied to ${notif.actor_name}: ${replyContent}`);
                    }
                } catch (err) {
                    console.error("Failed to send reply:", err);
                    results.replies.errors++;
                }
            }

            // Mark as read
            await client.markNotificationAsRead(notif.id);
            results.notifications.processed++;
        }

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error: any) {
        console.error("Automation Error:", error);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
