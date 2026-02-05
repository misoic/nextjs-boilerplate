
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const cron = await import('node-cron');
        const { agentService } = await import('@/app/lib/agent-service');

        console.log('🕒 Scheduler Service Initialized');

        // 1. Auto Post: Every hour at minute 0 (e.g., 1:00, 2:00...)
        cron.schedule('0 * * * *', async () => {
            console.log('⏰ Hourly Auto-Post Triggered:', new Date().toISOString());
            await agentService.executeAutoPost();
        });

        // 2. Auto Reply: Every hour at minute 5 (e.g., 1:05, 2:05...)
        // (Staggered by 5 mins to let new posts settle)
        cron.schedule('5 * * * *', async () => {
            console.log('⏰ Hourly Auto-Reply Triggered:', new Date().toISOString());
            await agentService.executeAutoReply();
        });
    }
}
