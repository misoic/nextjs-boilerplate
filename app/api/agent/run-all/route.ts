import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';
import { supabase } from '@/app/lib/supabase';
import { agentService } from '@/app/lib/agent-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Allow longer timeout for AI generation

export async function POST() {
    try {
        // 1. Get Active Agent API Key
        // Priority: DB verified key > Env key
        const { data: agent } = await supabase
            .from('agents')
            .select('api_key')
            .eq('is_verified', true)
            .order('updated_at', { ascending: false })
            .limit(1)
            .single();

        let apiKey = agent?.api_key || process.env.BOTMADANG_API_KEY;

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'No verified agent found' }, { status: 401 });
        }

        const results = {
            queue: { processed: false, type: null as any },
            sensor: { queued: 0 },
            watcher: { processedCount: 0 }
        };

        // STEP 1: UNIFIED WORKER (Priority) 👷
        // Checks queue and processes exactly ONE task (Post Draft or Reply Task)
        console.log("👷 Running Queue Worker...");
        try {
            const queueResult = await agentService.processQueueItem();
            if (queueResult.processed) {
                console.log(`✅ Worker: Processed ${queueResult.type}`);
                results.queue = { processed: true, type: queueResult.type };
            } else {
                console.log("💤 Worker: No tasks in queue.");
            }
        } catch (e) {
            console.error("Queue Worker Error:", e);
        }

        // STEP 2: REPLY SENSOR 📡
        // Checks for unread notifications and queues them (Does not reply directly)
        console.log("📡 Running Reply Sensor...");
        try {
            const sensorResult = await agentService.executeAutoReply();
            if (sensorResult.queued > 0) {
                console.log(`📥 Sensor: Enqueued ${sensorResult.queued} replies.`);
                results.sensor = { queued: sensorResult.queued };
            }
        } catch (e: any) {
            console.error("Sensor Error:", e);
        }

        // STEP 3: NEW POST WATCHER (Optional/Independent) 👀
        // Watches for new posts to comment on (This is separate from notification replies)
        // We keep this as per previous logic, but it throttles itself.
        console.log("👀 Checking for new posts...");
        try {
            const watcherResult = await agentService.executeNewPostWatcher();
            if (watcherResult && watcherResult.processedCount > 0) {
                console.log(`✅ NewPostWatcher: Processed ${watcherResult.processedCount} posts.`);
                results.watcher = { processedCount: watcherResult.processedCount };
            }
        } catch (e) {
            console.error("NewPostWatcher Error:", e);
        }

        return NextResponse.json({
            success: true,
            results
        });

    } catch (error: any) {
        // Enhanced Error Logging
        console.error("❌ Automation Fatal Error:", error);

        if (error.response) {
            console.error("🔍 API Response Error Data:", JSON.stringify(error.response.data, null, 2));
            console.error("🔍 API Status:", error.response.status);
        }

        const errorMessage = error.response?.data?.error || error.message || "Unknown Automation Error";

        if (errorMessage.includes('Rate Limit') || errorMessage.includes('너무 빠른 요청')) {
            return NextResponse.json(
                { success: false, error: "너무 빨리 글을 쓰고 있어요! 1분만 쉬었다가 다시 눌러주세요. ☕" },
                { status: 429 }
            );
        }

        return NextResponse.json(
            {
                success: false,
                error: errorMessage,
                details: error.stack // Optional: for debugging
            },
            { status: 500 }
        );
    }
}
