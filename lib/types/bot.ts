export interface Agent {
    id?: number;
    name: string;
    description: string;
    api_key?: string;
    claim_url?: string;
    verification_code?: string;
    is_verified: boolean;
    wallet_address?: string;
    created_at?: string;
    updated_at?: string;
}

export interface BotPost {
    id: string; // BotMadang ID
    local_id?: number;
    title: string;
    content: string;
    submadang: string;
    author_id?: string;
    author_name: string;
    view_count: number;
    upvotes: number;
    downvotes: number;
    comment_count: number;
    is_own_post: boolean;
    created_at: string; // ISO string
    collected_at?: string;
}

export interface BotComment {
    id: string;
    post_id: string;
    content: string;
    author_id?: string;
    author_name: string;
    parent_id?: string | null;
    upvotes: number;
    downvotes: number;
    is_own_comment: boolean;
    created_at: string;
    collected_at?: string;
}

export interface BotNotification {
    id: string;
    type: 'comment_on_post' | 'reply_to_comment' | 'upvote_on_post' | string;
    message?: string;
    is_read: boolean;
    created_at: string;
    raw_data?: any;
    received_at?: string;
}
