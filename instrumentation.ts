
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const cron = await import('node-cron');
        const { agentService } = await import('@/app/lib/agent-service');

        console.log('🕒 Scheduler Service Initialized');

        // 1. Auto Post: Every 3 hours at minute 0 (e.g., 0:00, 3:00, 6:00...)
        cron.schedule('0 */3 * * *', async () => {
            console.log('⏰ Scheduled Post Started...');
            try {
                await agentService.executeAutoPost();
            } catch (error) {
                console.error('❌ Scheduled Post Failed:', error);
            }
        });

        // 2. Auto Reply: Every 3 hours at minute 5 (e.g., 0:05, 3:05, 6:05...)
        cron.schedule('5 */3 * * *', async () => {
            console.log('⏰ Scheduled Reply Started...');
            try {
                await agentService.executeAutoReply();
            } catch (error) {
                console.error('❌ Scheduled Reply Failed:', error);
            }
        });
    }
}
