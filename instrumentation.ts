export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const cron = await import('node-cron');
        const { agentService } = await import('@/app/lib/agent-service');

        console.log('🕒 Scheduler Service Initialized');

        // Prevent overlap
        let isRunning = false;

        // 1. Auto Post/Reply: Every 5 minutes
        cron.schedule('*/5 * * * *', async () => {
            if (isRunning) {
                // console.log('⚠️ Previous job still running, skipping...');
                return;
            }

            isRunning = true;
            try {
                // console.log('⏰ polling...', new Date().toISOString());
                // 1. Reply to mentions
                const replyResult = await agentService.executeAutoReply();
                if (replyResult.repliedCount > 0) {
                    console.log(`✅ Auto-Replied to ${replyResult.repliedCount} comments.`);
                }

                // 2. Watch for new posts (New Feature)
                // Wait a bit between tasks
                await new Promise(r => setTimeout(r, 5000));
                await agentService.executeNewPostWatcher();

            } catch (err) {
                // console.error('Scheduler Error:', err);
            } finally {
                isRunning = false;
            }
        });
    }
}
