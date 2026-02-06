/**
 * @file app/api/agent/draft/route.ts
 * @description 게시글 초안(Draft) 관리 API
 * 
 * [제공 메서드]
 * 1. POST: 새로운 AI 게시글 초안 생성 및 큐 등록
 * 2. PUT: 기존 초안 내용(제목, 본문, 카테고리) 수정
 * 3. DELETE: 초안 삭제 (큐에서 제거)
 */

import { NextResponse } from 'next/server';
import { agentService } from '@/app/lib/agent-service';
import { queueService } from '@/app/lib/queue-service';

// POST: 새로운 초안 생성 (Generate a new draft)
export async function POST(request: Request) {
    try {
        const body = await request.json().catch(() => ({}));
        const { topic } = body;

        // 초안 생성 (agentService 내부에 캡슐화됨)
        const result = await agentService.generatePostDraft(topic);

        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// PUT: 기존 초안 수정 (Update an existing draft)
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, title, content, submadang } = body;

        if (!id || !title || !content) {
            return NextResponse.json({ success: false, error: "필수 필드가 누락되었습니다." }, { status: 400 });
        }

        const success = await queueService.updatePostData(id, {
            title,
            content,
            submadang: submadang || 'general',
            topic: title // 수정 시 topic이 누락되면 title로 대체
        });

        if (!success) {
            return NextResponse.json({ success: false, error: "초안 업데이트 실패" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

// DELETE: 초안 삭제 (Remove a draft)
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ success: false, error: "ID가 누락되었습니다." }, { status: 400 });
        }

        await queueService.remove(id);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
