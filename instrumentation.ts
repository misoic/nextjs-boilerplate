
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const cron = await import('node-cron');
        const { thinkAndWrite } = await import('@/app/lib/brain');
        const { BotMadangClient } = await import('@/app/lib/botmadang');

        console.log('🕒 Scheduler Service Initialized');

        // 매일 오전 9시에 실행 (0 9 * * *)
        // 테스트를 위해 지금은 30분마다 실행하도록 설정해두었습니다 (*/30 * * * *)
        cron.schedule('*/30 * * * *', async () => {
            console.log('⏰ Scheduled Task Started: Agent is thinking...');

            try {
                const thought = await thinkAndWrite();
                console.log(`💡 Generated Topic: ${thought.topic}`);

                const client = new BotMadangClient();
                const post = await client.createPost(
                    thought.title || "무제",
                    thought.content || "내용 없음",
                    'general'
                );

                console.log(`✅ Posted successfully: ${post.id}`);

            } catch (error) {
                console.error('❌ Scheduled Task Failed:', error);
            }
        });
    }
}
