import { supabase } from '@/app/lib/supabase';

export type TaskType = 'post_draft' | 'reply_task';

export interface QueuedTask {
    id: string; // UUID
    type: TaskType;
    status: 'pending' | 'failed' | 'processing' | 'completed';
    retryCount: number;
    createdAt: string;

    // 'post_draft'용: 게시 준비 완료
    postData?: {
        topic: string;
        title: string;
        content: string;
        submadang: string;
    };

    // 'reply_task'용: 생각하기 + 게시하기 필요
    replyData?: {
        notificationId: string;
        postId: string;
        commentId?: string;
        user: string;
        userComment: string;
        postTitle: string;
    };
}

export const queueService = {
    /**
     * 작업을 큐(DB)에 추가합니다.
     */
    async enqueue(task: Omit<QueuedTask, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<string | null> {
        try {
            // 1. 중복 제거 (답글만 해당) - 이상적으로는 DB Unique Index가 처리하지만, 로직 보존을 위해 수동 체크
            if (task.type === 'reply_task' && task.replyData) {
                // 동일한 notificationId를 가진 대기 중인 작업이 있는지 확인
                const { data: existing } = await supabase
                    .from('task_queue')
                    .select('id')
                    .eq('type', 'reply_task')
                    .eq('status', 'pending')
                    // jsonb 경로 쿼리 - 특정 구문이 필요할 수 있지만, 여기서는 DB 제약 조건이나 단순 필터에 의존
                    // 사실, 사용자에게 요청한 UNIQUE INDEX에 의존하는 것이 좋습니다.
                    // 삽입 시 409 에러가 나면 기존 ID를 반환하거나 null을 반환합니다.
                    // 하지만 이전 로직과 일치시키기 위해 먼저 검색합니다.
                    // 올바른 JSONB 쿼리: payload->'replyData'->>'notificationId'
                    .filter('payload->replyData->>notificationId', 'eq', task.replyData.notificationId)
                    .single();

                if (existing) {
                    console.log(`⚠️ 중복 답글 작업 건너뜀 (알림 ID: ${task.replyData.notificationId})`);
                    return existing.id;
                }
            }

            // 2. 삽입 (Insert)
            const payload = task.type === 'post_draft' ? { postData: task.postData } : { replyData: task.replyData };

            const { data, error } = await supabase
                .from('task_queue')
                .insert({
                    type: task.type,
                    status: 'pending',
                    payload: payload,
                    retry_count: 0
                })
                .select('id')
                .single();

            if (error) {
                // 중복 키 에러 (409) 체크
                if (error.code === '23505') {
                    console.log(`⚠️ 작업이 이미 존재합니다 (DB 제약 조건).`);
                    return null;
                }
                console.error("🔥 Supabase 삽입 오류:", error);
                throw error;
            }

            return data.id;

        } catch (error: any) {
            console.error("큐 삽입 오류:", error.message);
            // 위에서 잡히지 않은 에러라면 호출자가 알 수 있도록 다시 던짐
            if (error.message.includes('Supabase')) throw error;
            return null;
        }
    },

    /**
     * 다음 대기 작업을 가져옵니다 (우선순위: 게시글 > 답글)
     */
    async peek(prioritizeType?: TaskType): Promise<QueuedTask | null> {
        try {
            let query = supabase
                .from('task_queue')
                .select('*')
                .eq('status', 'pending')
                .order('created_at', { ascending: true })
                .limit(1);

            if (prioritizeType) {
                // 우선순위 타입을 먼저 가져오기 시도
                const { data: priorityData } = await supabase
                    .from('task_queue')
                    .select('*')
                    .eq('status', 'pending')
                    .eq('type', prioritizeType)
                    .order('created_at', { ascending: true })
                    .limit(1)
                    .single();

                if (priorityData) {
                    return mapRowToTask(priorityData);
                }
                // 없으면 기본 쿼리(FIFO)로 계속 진행
            }

            const { data, error } = await query.single();

            if (error && error.code !== 'PGRST116') { // PGRST116은 "행 없음"
                console.error("큐 조회 오류:", error.message);
            }

            if (!data) return null;
            return mapRowToTask(data);

        } catch (error) {
            return null;
        }
    },

    /**
     * 큐에서 작업을 제거합니다 (삭제 또는 완료 표시)
     */
    async remove(id: string): Promise<void> {
        // 테이블을 깨끗하게 유지하기 위해 삭제하거나 status='completed'로 업데이트합니다.
        // 현재는 파일 시스템 동작과 일치시키기 위해 삭제합니다.
        await supabase.from('task_queue').delete().eq('id', id);
    },

    /**
     * 작업을 실패 상태로 표시합니다
     */
    async markFailed(id: string): Promise<void> {
        // 현재 재시도 횟수 가져오기
        const { data: task } = await supabase.from('task_queue').select('retry_count').eq('id', id).single();
        if (!task) return;

        const newCount = (task.retry_count || 0) + 1;

        if (newCount >= 3) {
            console.warn(`🗑️ 작업 ${id} 실패 횟수 과다. 삭제합니다.`);
            await supabase.from('task_queue').delete().eq('id', id);
        } else {
            await supabase.from('task_queue').update({ retry_count: newCount }).eq('id', id);
        }
    },

    /**
     * 대기 중인 초안의 게시글 데이터를 업데이트합니다
     */
    async updatePostData(id: string, postData: any): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('task_queue')
                .update({
                    payload: { postData }
                })
                .eq('id', id)
                .eq('type', 'post_draft')
                .eq('status', 'pending');

            if (error) throw error;
            return true;
        } catch (error: any) {
            console.error("큐 업데이트 오류:", error.message);
            return false;
        }
    },

    /**
     * 큐 통계를 가져옵니다
     */
    async getStats(): Promise<{ total: number; pending: number }> {
        const { count: total } = await supabase.from('task_queue').select('*', { count: 'exact', head: true });
        const { count: pending } = await supabase.from('task_queue').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        return {
            total: total || 0,
            pending: pending || 0
        };
    }
};

// 헬퍼: DB 행을 QueuedTask로 매핑 (JSONB 페이로드 처리)
function mapRowToTask(row: any): QueuedTask {
    const payload = row.payload || {};
    return {
        id: row.id,
        type: row.type as TaskType,
        status: row.status,
        retryCount: row.retry_count,
        createdAt: row.created_at,
        postData: payload.postData,
        replyData: payload.replyData
    };
}
