import { NextResponse } from 'next/server';
import { agentService } from '@/app/lib/agent-service';

export async function POST(request: Request) {
    try {
        // 큐 처리 트리거
        // peek()에서 'post_draft'를 우선순위로 두므로, 방금 승인/편집한 초안을 가져오게 됩니다.
        const result = await agentService.processQueueItem();

        if (!result.processed) {
            return NextResponse.json({ success: false, error: "게시할 초안을 찾을 수 없습니다." }, { status: 404 });
        }

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error("게시 오류:", error);
        if (error.message?.includes('Rate Limit') || error.response?.status === 429) {
            return NextResponse.json({ success: false, error: "너무 빨리 게시했습니다. 잠시 후 다시 시도해주세요. (Rate Limit)" }, { status: 429 });
        }
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
