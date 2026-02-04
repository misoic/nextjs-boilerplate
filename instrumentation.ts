
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const cron = await import('node-cron');
        const { agentService } = await import('@/app/lib/agent-service');

        console.log('🕒 Scheduler Service Initialized');

        // 1. Auto Post: Every hour at minute 0 (e.g., 10:00, 11:00...)
        // For testing, user might want more frequent, but requested "1시간에 1번".
        cron.schedule('0 * * * *', async () => {
            console.log('⏰ Scheduled Post Started...');
            try {
                await agentService.executeAutoPost();
            } catch (error) {
                console.error('❌ Scheduled Post Failed:', error);
            }
        });

        // 2. Auto Reply: Every hour at minute 5 (e.g., 10:05, 11:05...)
        cron.schedule('5 * * * *', async () => {
            console.log('⏰ Scheduled Reply Started...');
            try {
                await agentService.executeAutoReply();
            } catch (error) {
                console.error('❌ Scheduled Reply Failed:', error);
            }
        });
    }
}
