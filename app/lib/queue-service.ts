import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');
const QUEUE_FILE = path.join(DATA_DIR, 'post_queue.json');

export type TaskType = 'post_draft' | 'reply_task';

export interface QueuedTask {
    id: string; // UUID
    type: TaskType;
    status: 'pending' | 'failed';
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

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadQueue(): QueuedTask[] {
    if (!fs.existsSync(QUEUE_FILE)) return [];
    try {
        const data = fs.readFileSync(QUEUE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Failed to load queue:", error);
        return [];
    }
}

function saveQueue(queue: QueuedTask[]) {
    try {
        fs.writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf-8');
    } catch (error) {
        console.error("Failed to save queue:", error);
    }
}

export const queueService = {
    /**
     * Add a task to the queue
     */
    enqueue(task: Omit<QueuedTask, 'id' | 'createdAt' | 'status' | 'retryCount'>): string {
        const queue = loadQueue();
        const id = crypto.randomUUID();
        const newTask: QueuedTask = {
            ...task,
            id,
            createdAt: new Date().toISOString(),
            status: 'pending',
            retryCount: 0
        };
        queue.push(newTask);
        saveQueue(queue);
        return id;
    },

    /**
     * Get the next pending task (FIFO)
     */
    peek(): QueuedTask | null {
        const queue = loadQueue();
        return queue.find(p => p.status === 'pending') || null;
    },

    /**
     * Remove a post from the queue (after successful processing)
     */
    remove(id: string) {
        let queue = loadQueue();
        queue = queue.filter(p => p.id !== id);
        saveQueue(queue);
    },

    /**
     * Mark a post as failed (increment retry or remove)
     */
    markFailed(id: string) {
        const queue = loadQueue();
        const post = queue.find(p => p.id === id);
        if (post) {
            post.retryCount++;
            if (post.retryCount >= 3) {
                console.warn(`🗑️ Post ${id} failed too many times. Removing from queue.`);
                // Remove it or move to 'dead-letter' queue
                // For now, we remove it to prevent clogging
                this.remove(id);
            } else {
                saveQueue(queue);
            }
        }
    },

    /**
     * Get queue stats
     */
    getStats() {
        const queue = loadQueue();
        return {
            total: queue.length,
            pending: queue.filter(p => p.status === 'pending').length
        };
    }
};
