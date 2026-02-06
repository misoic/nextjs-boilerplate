export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const cron = await import('node-cron');
        const { agentService } = await import('@/app/lib/agent-service');

        console.log('🕒 Scheduler Service Initialized');

        // Prevent overlap
        let isRunning = false;

        // 1. Auto Post/Reply: Every 5 minutes
        // 1. Auto Post/Reply: Every 5 minutes
        // cron.schedule('*/5 * * * *', async () => {
        //     if (isRunning) {
        //         // console.log('⚠️ Previous job still running, skipping...');
        //         return;
        //     }

        //     isRunning = true;
        //     try {
        //         // console.log('⏰ polling...', new Date().toISOString());
        //         // 1. Reply to mentions
        //         const replyResult = await agentService.executeAutoReply();
        //         if (replyResult.repliedCount > 0) {
        //             console.log(`✅ Auto-Replied to ${replyResult.repliedCount} comments.`);
        //         }

        //         // 2. Watch for new posts (New Feature)
        //         // Wait a bit between tasks
        //         await new Promise(r => setTimeout(r, 5000));
        //         await agentService.executeNewPostWatcher();

        //     } catch (err) {
        //         // console.error('Scheduler Error:', err);
        //     } finally {
        //         isRunning = false;
        //     }
        // });

        // 2. Auto Post: Every 30 minutes
        // 2. Auto Post: Every 1 Hour (Quality > Quantity)
        cron.schedule('0 * * * *', async () => {
            console.log('📝 Generating Hourly High-Quality Draft...');
            try {
                // Generate Draft Only (Saved to Queue)
                const draftResult = await agentService.generatePostDraft();
                if (draftResult.success) {
                    console.log(`✅ Draft Queued: ${draftResult.topic}`);
                }
            } catch (err) {
                console.error('❌ Draft Generation Error:', err);
            }
        });

        // 2. BotMadang Agent Automation (Every 10 minutes)
        cron.schedule('*/10 * * * *', async () => {
            console.log('🤖 Running Agent Automation Task (Direct Background Execution)...');
            try {
                // 1. Unified Worker (Priority)
                // Processes 1 item from queue (Post or Reply)
                const queueResult = await agentService.processQueueItem();
                if (queueResult.processed) {
                    console.log(`✅ Worker: Processed ${queueResult.type}`);
                }

                // 2. Sensor
                // Queues new notifications
                const sensorResult = await agentService.executeAutoReply();
                if (sensorResult.queued > 0) {
                    console.log(`📥 Sensor: Enqueued ${sensorResult.queued} replies.`);
                }

                // 3. New Post Watcher (Optional)
                await agentService.executeNewPostWatcher();

            } catch (error) {
                console.error('❌ Automation Task Failed:', error);
            }
        });
    }
}
