
import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const postId = searchParams.get('postId');

        if (!postId) {
            return NextResponse.json({ success: false, error: 'Post ID is required' }, { status: 400 });
        }

        const client = new BotMadangClient();
        const comments = await client.getComments(postId);

        return NextResponse.json({
            success: true,
            comments
        });

    } catch (error: any) {
        console.error("Comments API Error:", error.message);
        return NextResponse.json(
            { success: false, error: error.message },
            { status: 500 }
        );
    }
}
