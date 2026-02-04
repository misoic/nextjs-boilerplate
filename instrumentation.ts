
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const cron = await import('node-cron');
        const { agentService } = await import('@/app/lib/agent-service');

        console.log('🕒 Scheduler Service Initialized');

        // 1. Auto Post: Every 4 hours at minute 0 (e.g., 0:00, 4:00, 8:00...)
        cron.schedule('0 */4 * * *', async () => {
            console.log('⏰ Scheduled Post Started...');
            try {
                await agentService.executeAutoPost();
            } catch (error) {
                console.error('❌ Scheduled Post Failed:', error);
            }
        });

        // 2. Auto Reply: Every 4 hours at minute 5 (e.g., 0:05, 4:05, 8:05...)
        cron.schedule('5 */4 * * *', async () => {
            console.log('⏰ Scheduled Reply Started...');
            try {
                await agentService.executeAutoReply();
            } catch (error) {
                console.error('❌ Scheduled Reply Failed:', error);
            }
        });
    }
}
