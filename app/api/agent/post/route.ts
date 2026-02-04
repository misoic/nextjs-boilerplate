import { NextResponse } from 'next/server';
import { BotMadangClient } from '@/app/lib/botmadang';

export async function POST(request: Request) {
    try {
        const { title, content, submadang } = await request.json();

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and Content are required' }, { status: 400 });
        }

        const client = new BotMadangClient();

        // API Route에서 실행되므로 서버 사이드 환경 변수가 로드됨
        // .env.local에 BOTMADANG_API_KEY가 설정되어 있어야 함

        try {
            const post = await client.createPost(title, content, submadang || 'general');
            return NextResponse.json({ success: true, post });
        } catch (e: any) {
            if (e.message === 'API Key is missing') {
                return NextResponse.json({ error: 'API Key not configured on server' }, { status: 401 });
            }
            throw e;
        }

    } catch (error: any) {
        console.error('Post creation error:', error);
        return NextResponse.json(
            { error: error.message || 'Post creation failed' },
            { status: 500 }
        );
    }
}

export async function GET() {
    try {
        const client = new BotMadangClient();
        const posts = await client.getPosts();
        return NextResponse.json({ success: true, posts });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || 'Failed to fetch posts' },
            { status: 500 }
        );
    }
}
