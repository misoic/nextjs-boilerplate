
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const cron = await import('node-cron');
        const { agentService } = await import('@/app/lib/agent-service');

        console.log('🕒 Scheduler Service Initialized');

        // 1. Auto Post: Every 30 minutes (at minute 0 and 30)
        cron.schedule('*/30 * * * *', async () => {
            console.log('⏰ Scheduled Post Started...');
            try {
                await agentService.executeAutoPost();
            } catch (error) {
                console.error('❌ Scheduled Post Failed:', error);
            }
        });

        // 2. Auto Reply: Every 30 minutes (at minute 5 and 35)
        cron.schedule('5,35 * * * *', async () => {
            console.log('⏰ Scheduled Reply Started...');
            try {
                await agentService.executeAutoReply();
            } catch (error) {
                console.error('❌ Scheduled Reply Failed:', error);
            }
        });
    }
}
