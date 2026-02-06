
/**
 * @file app/lib/agent-service.ts
 * @description 에이전트의 핵심 비즈니스 로직을 담당하는 서비스 클래스
 * 
 * [주요 책임]
 * 1. AI(Brain)를 이용한 게시글 초안 생성 (`generatePostDraft`)
 * 2. 큐에 있는 작업(초안 게시, 답글 등) 처리 (`processQueueItem`)
 * 3. 봇마당 알림 감시 및 자동 답글 모니터링 (`executeAutoReply`)
 * 4. 신규 게시글 감시 및 댓글 달기 (`executeNewPostWatcher`)
 */

import { BotMadangClient } from './botmadang';
import { thinkAndWrite, thinkReply } from './brain';
import { sendTelegramMessage } from './telegram';
import fs from 'fs';
import { queueService } from './queue-service';

export const agentService = {
    /**
     * 1단계: 게시글 초안 생성 및 대기열 저장 (API에 바로 게시하지 않음)
     */
    async generatePostDraft(topic?: string) {
        console.log("🧠 자동 게시: 초안 생성 중...");
        try {
            // 1. 에이전트 이름 가져오기
            const { supabase } = await import('@/app/lib/supabase');
            const { data: dbAgent } = await supabase
                .from('agents')
                .select('name') // 생각하는 데 이름만 필요함
                .eq('is_verified', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            const agentName = dbAgent?.name || "Agent";

            // 2. 생각하기 (AI 생성)
            const thought = await thinkAndWrite(agentName, topic);
            console.log(`🧠 생각 생성 완료: ${thought.title} (${thought.content.length} 자)`);

            // 3. 대기열(Queue)에 저장
            const id = await queueService.enqueue({
                type: 'post_draft',
                postData: {
                    topic: thought.topic,
                    title: thought.title,
                    content: thought.content,
                    submadang: 'general'
                }
            });

            console.log(`✅ 초안 대기열 저장 완료! ID: ${id}`);
            return { success: true, queueId: id, topic: thought.topic };

        } catch (error: any) {
            console.error("❌ 초안 생성 실패:", error);
            console.error(JSON.stringify(error, null, 2)); // 전체 에러 객체 로그
            throw error;
        }
    },

    /**
     * 통합 워커: 대기열에서 작업 하나를 가져와 처리 (게시 또는 답글)
     */
    async processQueueItem() {
        console.log("👷 큐 워커: 작업 확인 중...");
        // 'post_draft'를 우선 처리하여 새 글이 답글들에 밀리지 않게 함
        const task = await queueService.peek('post_draft');

        if (!task) {
            return { processed: false, reason: "empty" };
        }

        console.log(`🚀 작업 처리 시작: [${task.type}] ${task.id}`);

        try {
            // API 키 가져오기 (공유)
            const { supabase } = await import('@/app/lib/supabase');
            const { data: dbAgent } = await supabase
                .from('agents')
                .select('api_key, name')
                .eq('is_verified', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            const apiKey = dbAgent?.api_key || process.env.BOTMADANG_API_KEY;
            if (!apiKey) throw new Error("인증된 에이전트가 없습니다.");

            const client = new BotMadangClient({ apiKey });

            // --- 유형 1: 초안 게시 (POST DRAFT) ---
            if (task.type === 'post_draft' && task.postData) {
                const post = await client.createPost(
                    task.postData.title,
                    task.postData.content,
                    task.postData.submadang
                );
                console.log(`✅ 게시글 등록 완료! ID: ${post.id}`);
                await sendTelegramMessage(`📝 <b>새 글 게시 완료!</b>\n\n<b>제목:</b> ${task.postData.title}\n<a href="https://botmadang.org/post/${post.id}">게시글 보기</a>`);
                queueService.remove(task.id);
                return { processed: true, type: 'post', id: post.id };
            }

            // --- 유형 2: 답글 작업 (REPLY TASK) ---
            if (task.type === 'reply_task' && task.replyData) {
                const { replyData } = task;
                console.log(`💬 사용자 ${replyData.user}에게 답글 생각 중...`);

                // Think
                const replyContent = await thinkReply({
                    agentName: dbAgent?.name || "Agent",
                    originalPost: replyData.postTitle,
                    userComment: replyData.userComment,
                    user: replyData.user
                });

                // Post Comment
                await client.createComment(replyData.postId, replyContent, replyData.commentId);
                console.log(`✅ Posted Reply to ${replyData.user}`);

                await sendTelegramMessage(`🔔 <b>답글 작성 완료!</b>\n\n<b>사용자:</b> ${replyData.user}\n<b>내용:</b> ${replyContent}`);

                // Mark notification read? (It was already marked read/processed when queued? No, usually we mark read AFTER reply.)
                // Ah, the sensing logic should grab unread, enqueue it, AND mark it read? 
                // Or leave it unread until processed?
                // BETTER: Leave it unread. But then sensing will pick it up again.
                // FIX: Sensing should mark it as Read OR we track "Queued" notifications?
                // SAFEST: Sensing marks notification as READ immediately after Enqueue success.
                // If tasks fail in Queue, they stay in Queue (retry).

                // Wait, if we mark read in sensing, we lose the "Unread" beacon.
                // But if we don't, sensing will duplicate tasks.
                // DECISION: Sensing marks notification as READ immediately after Enqueue success.
                // If tasks fail in Queue, they stay in Queue (retry).

                // Note: We need notification ID to mark read? 
                // Currently `replyData` has `notificationId`.
                // Actually, let's assume Sensing marked it read.

                queueService.remove(task.id);
                return { processed: true, type: 'reply', user: replyData.user };
            }

            // Unknown Type
            console.warn(`⚠️ Unknown task type: ${task.type}. Removing.`);
            queueService.remove(task.id);
            return { processed: false, reason: "unknown_type" };

        } catch (error: any) {
            console.error(`❌ Task ${task.type} Failed:`, error.message);

            // Handle Rate Limits explicitly
            if (error.response?.status === 429 || error.message?.includes('Rate Limit')) {
                console.warn("⚠️ Rate Limit Hit. Keeping in queue.");
                // Throw specific error to be caught by API route
                throw new Error("Rate Limit");
            }

            // For other errors, mark failed
            queueService.markFailed(task.id);
            throw error;
        }
    },

    /**
     * SENSOR: Scan for notifications and enqueue tasks (Do not reply directly)
     */
    async executeAutoReply() {
        try {
            const { supabase } = await import('@/app/lib/supabase');
            const { data: dbAgent } = await supabase
                .from('agents')
                .select('api_key')
                .eq('is_verified', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();
            const apiKey = dbAgent?.api_key || process.env.BOTMADANG_API_KEY;
            if (!apiKey) return { success: false, error: "No agent" };

            const client = new BotMadangClient({ apiKey });

            // 1. Get Unread Notifications
            const notifications = await client.getNotifications(true);
            const unreadCount = notifications.length;

            if (unreadCount === 0) return { success: true, queued: 0 };

            console.log(`🔎 Found ${unreadCount} unread notifications.`);

            // Queue All Valid Notifications (Limit only if crazy high, e.g., > 20)
            const safeLimit = notifications.slice(0, 10);
            let queuedCount = 0;

            for (const notif of safeLimit) {
                // Filter relevant types
                if (notif.type !== 'comment_on_post' && notif.type !== 'reply_to_comment') {
                    await client.markNotificationAsRead(notif.id);
                    continue;
                }

                // Check for duplicates? (handled by mark read)

                // ENQUEUE
                queueService.enqueue({
                    type: 'reply_task',
                    replyData: {
                        notificationId: String(notif.id),
                        postId: notif.post_id,
                        commentId: notif.comment_id,
                        user: notif.actor_name || "Unknown",
                        userComment: notif.content_preview || "",
                        postTitle: notif.post_title || ""
                    }
                });

                // Mark Read IMMEDIATELY to prevent double queuing
                await client.markNotificationAsRead(notif.id);
                queuedCount++;
            }

            console.log(`📥 Queued ${queuedCount} reply tasks.`);
            return { success: true, queued: queuedCount };

        } catch (error: any) {
            console.error("AutoReply Sensor Error:", error);
            throw error;
        }
    },

    /**
     * Watches for NEW posts and comments on them
     */
    async executeNewPostWatcher() {
        if (process.env.NEXT_RUNTIME !== 'nodejs') return;

        const path = await import('path');
        const STATE_FILE = path.join(process.cwd(), 'agent_state.json');

        console.log("👀 NewPostWatcher: Checking for new posts...");
        try {
            // Fetch API Key
            const { supabase } = await import('@/app/lib/supabase');
            const { data: dbAgent } = await supabase
                .from('agents')
                .select('api_key')
                .eq('is_verified', true)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            const apiKey = dbAgent?.api_key || process.env.BOTMADANG_API_KEY;

            if (!apiKey) return;

            const client = new BotMadangClient({ apiKey });
            const me = await client.getMe();
            // Fetch 10 to be safe (reduced from 50 to avoid Rate Limits)
            const posts = await client.getPosts(10);

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
                if (posts.length === 0) {
                    console.log("no posts found to initialize state.");
                    return;
                }
                console.log("✨ First run: Marking latest post as baseline.");
                const latestId = posts[0].id; // Safe now
                fs.writeFileSync(STATE_FILE, JSON.stringify({ last_seen_post_id: latestId }));
                return;
            }

            // 3. Find New Posts
            const newPosts: any[] = [];
            for (const post of posts) {
                // Safety Check: Ensure post and author exist
                if (!post || !post.id || !post.author) {
                    console.warn(`⚠️ Skipping malformed post: ${JSON.stringify(post)}`);
                    continue;
                }

                // Fix: Compare as strings to avoid type mismatch (number vs string)
                if (String(post.id) === String(lastSeenId)) break;
                if (post.author.id === me.id) continue; // Skip my own posts
                newPosts.push(post);
            }

            if (newPosts.length === 0) {
                // console.log("💤 No new posts.");
                return;
            }

            console.log(`🚀 Found ${newPosts.length} NEW posts!`);

            // Process Oldest First (Reverse the array)
            const postsToProcess = newPosts.reverse();

            // 4. Comment on them (with Smart Filtering)
            let processedCount = 0;
            for (const post of postsToProcess) {
                try {
                    // --- 🧠 Smart Filter Logic 🧠 ---
                    const isUnique = post.comment_count === 0; // Lonely post
                    const randomChance = Math.random() < 0.3;  // 30% chance

                    if (!isUnique && !randomChance) {
                        console.log(`⏩ Skipping post "${post.title}" (Saving energy 🔋)`);
                        // Still update state to avoid "stuck" processing? 
                        // YES. We saw it, we chose to skip it.
                        fs.writeFileSync(STATE_FILE, JSON.stringify({ last_seen_post_id: post.id }));
                        continue;
                    }

                    const reason = isUnique ? "Lonely Post (Priority)" : "Random Selection (30%)";
                    console.log(`💬 Commenting on "${post.title}" (${reason})`);

                    // Think
                    const commentContent = await thinkReply({
                        agentName: me.name,
                        originalPost: post.title + "\n" + post.content,
                        userComment: "새로운 글이 올라왔습니다. 반응해주세요.",
                        user: post.author.display_name
                    });

                    // Post Comment
                    await client.createComment(post.id, commentContent);
                    console.log(`✅ Commented on post ${post.id}`);

                    await sendTelegramMessage(`💬 <b>새 댓글 작성!</b> (${reason})\n\n<b>글 제목:</b> ${post.title}\n<b>내용:</b> ${commentContent}\n\n<a href="https://botmadang.org/post/${post.id}">게시글 바로가기</a>`);

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
