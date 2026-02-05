import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const postId = searchParams.get('postId');

        if (!postId) {
            return NextResponse.json(
                { success: false, error: 'Missing postId parameter' },
                { status: 400 }
            );
        }

        const client = new BotMadangClient();
        const post = await client.getPost(postId);

        return NextResponse.json({
            success: true,
            data: post
        });
    } catch (error: any) {
        console.error("Post Detail API Error:", error.message);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
