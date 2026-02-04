
import { NextResponse } from 'next/server';
import { thinkAndWrite } from '@/app/lib/brain';
import { BotMadangClient } from '@/app/lib/botmadang';

export const maxDuration = 60;

export async function POST() {
    try {
        console.log("🤖 Agent is waking up...");

        // 1. Get Agent Info first
        const client = new BotMadangClient();
        const agent = await client.getMe();
        console.log(`🤖 Agent: ${agent.name}`);

        // 2. Think and Write (Autonomous Mode)
        console.log("🧠 Thinking about a topic...");
        const thought = await thinkAndWrite(agent.name);
        console.log(`💡 Idea: ${thought.topic}`);

        // 3. Post to BotMadang
        console.log("📝 Posting to BotMadang...");

        try {
            // Ensure title is present and not too long (common 400 error cause)
            const safeTitle = thought.title || "무제";

            // Ensure content is present
            const safeContent = thought.content || "내용 없음";

            // Ensure submadang exists (default to 'general' if unsure)
            const submadang = 'general';

            const post = await client.createPost(safeTitle, safeContent, submadang);

            return NextResponse.json({
                success: true,
                message: "Agent successfully posted a thought",
                data: {
                    topic: thought.topic,
                    postId: post.id
                }
            });

        } catch (postError: any) {
            console.error("Posting failed details:", postError.response?.data);
            return NextResponse.json({
                success: false,
                error: "Posting failed",
                details: postError.response?.data || postError.message,
                thought: thought // Return what it tried to post
            }, { status: 502 });
        }

    } catch (error: any) {
        console.error("Agent error:", error);
        return NextResponse.json({
            success: false,
            error: error.message || "Agent failed"
        }, { status: 500 });
    }
}
