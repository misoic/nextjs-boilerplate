import { supabase } from '@/app/lib/supabase';

export type TaskType = 'post_draft' | 'reply_task';

export interface QueuedTask {
    id: string; // UUID
    type: TaskType;
    status: 'pending' | 'failed' | 'processing' | 'completed';
    retryCount: number;
    createdAt: string;

    // For 'post_draft': Ready to publish
    postData?: {
        topic: string;
        title: string;
        content: string;
        submadang: string;
    };

    // For 'reply_task': Needs thinking + publishing
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
     * Add a task to the queue (DB)
     */
    async enqueue(task: Omit<QueuedTask, 'id' | 'createdAt' | 'status' | 'retryCount'>): Promise<string | null> {
        try {
            // 1. Deduplication (Reply Only) - handled by DB Unique Index ideally, but manual check preserves logic
            if (task.type === 'reply_task' && task.replyData) {
                // Check DB for existing pending task with same notificationId
                const { data: existing } = await supabase
                    .from('task_queue')
                    .select('id')
                    .eq('type', 'reply_task')
                    .eq('status', 'pending')
                    // Query localized jsonb path - Syntax might be specific, but let's try strict filter or let DB constraint handle it
                    // Actually, let's rely on the UNIQUE INDEX I asked the user to create.
                    // If insert fails with 409, we return existing ID (found via select) or just null.
                    // But to match previous logic, let's select first.
                    // Proper JSONB query: payload->'replyData'->>'notificationId'
                    .filter('payload->replyData->>notificationId', 'eq', task.replyData.notificationId)
                    .single();

                if (existing) {
                    console.log(`⚠️ Skip duplicate reply task (Notif: ${task.replyData.notificationId})`);
                    return existing.id;
                }
            }

            // 2. Insert
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
                // Duplicate key error (409) check
                if (error.code === '23505') {
                    console.log(`⚠️ Task already exists (DB Constraint).`);
                    return null;
                }
                console.error("🔥 Supabase Insert Error:", error);
                throw error;
            }

            return data.id;

        } catch (error: any) {
            console.error("Queue Insert Error:", error.message);
            // Re-throw if it wasn't caught above to ensure caller knows
            if (error.message.includes('Supabase')) throw error;
            return null;
        }
    },

    /**
     * Get the next pending task (Priority: Post > Reply)
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
                // Try to fetch prioritized type first
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
                // If not found, continue with default query (FIFO)
            }

            const { data, error } = await query.single();

            if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows"
                console.error("Queue Peek Error:", error.message);
            }

            if (!data) return null;
            return mapRowToTask(data);

        } catch (error) {
            return null;
        }
    },

    /**
     * Remove a task from the queue (Delete or Mark Completed)
     */
    async remove(id: string): Promise<void> {
        // We delete it to keep table clean, or update status='completed'
        // Let's delete for now to match file-system behavior
        await supabase.from('task_queue').delete().eq('id', id);
    },

    /**
     * Mark a task as failed
     */
    async markFailed(id: string): Promise<void> {
        // Fetch current retry count
        const { data: task } = await supabase.from('task_queue').select('retry_count').eq('id', id).single();
        if (!task) return;

        const newCount = (task.retry_count || 0) + 1;

        if (newCount >= 3) {
            console.warn(`🗑️ Task ${id} failed too many times. Removing.`);
            await supabase.from('task_queue').delete().eq('id', id);
        } else {
            await supabase.from('task_queue').update({ retry_count: newCount }).eq('id', id);
        }
    },

    /**
     * Get queue stats
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

// Helper: Map DB Row to QueuedTask (Handling JSONB payload)
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
