import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'https://botmadang.org';

interface BotMadangConfig {
    apiKey?: string;
}

export interface Agent {
    id: string;
    name: string;
    api_key?: string;
    claim_url?: string;
}

export interface Post {
    id: number;
    title: string;
    content: string;
    author: {
        id: string;
        username: string;
        display_name: string;
    };
    created_at: string;
    vote_count: number;
    comment_count: number;
}

export class BotMadangClient {
    private client: AxiosInstance;
    private apiKey?: string;

    constructor(config: BotMadangConfig = {}) {
        this.apiKey = config.apiKey || process.env.BOTMADANG_API_KEY;
        this.client = axios.create({
            baseURL: BASE_URL,
            headers: {
                'Content-Type': 'application/json',
                'Accept-Language': 'ko-KR', // 필수로 요구됨
            },
        });

        // API Key가 있으면 헤더에 추가
        if (this.apiKey) {
            this.client.defaults.headers.common['Authorization'] = `Bearer ${this.apiKey}`;
        }
    }

    /**
     * 에이전트 등록 (API Key 발급)
     * @param name 에이전트 이름
     * @param description 에이전트 설명
     */
    async registerAgent(name: string, description: string): Promise<Agent> {
        try {
            const response = await this.client.post('/api/v1/agents/register', { name, description });
            if (response.data.success) {
                return response.data.agent;
            }
            throw new Error('Registration failed');
        } catch (error: any) {
            console.error('Agent Registration Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * 내 에이전트 정보 조회
     */
    async getMe(): Promise<Agent> {
        if (!this.apiKey) {
            throw new Error('API Key is missing');
        }
        const response = await this.client.get('/api/v1/agents/me');
        if (response.data.success) {
            return response.data.agent;
        }
        throw new Error(response.data.error || 'Failed to fetch agent info');
    }

    /**
     * 게시글 작성
     * @param title 게시글 제목
     * @param content 게시글 내용
     * @param submadang 게시판 카테고리
     */
    async createPost(title: string, content: string, submadang: string = 'general'): Promise<Post> {
        if (!this.apiKey) {
            throw new Error('API Key is missing');
        }
        try {
            const response = await this.client.post('/api/v1/posts', { title, content, submadang });
            return response.data;
        } catch (error: any) {
            if (error.response) {
                console.error('BotMadang API Error Data:', JSON.stringify(error.response.data, null, 2));
                console.error('BotMadang API Status:', error.response.status);
            }
            throw error;
        }
    }

    /**
     * 전체 게시글 조회
     */
    async getPosts(limit: number = 20): Promise<Post[]> {
        const response = await this.client.get('/api/v1/posts', {
            params: { limit }
        });
        // Fix: Return empty array if no posts or specific property
        return (response.data.posts || response.data.data || []) as Post[];
    }

    /**
     * 특정 에이전트의 게시글 조회
     * @param agentId 에이전트 ID
     */
    async getAgentPosts(agentId: string): Promise<Post[]> {
        const response = await this.client.get(`/api/v1/agents/${agentId}/posts`);
        return (response.data.posts || response.data.data || []) as Post[];
    }

    /**
     * 댓글 조회
     * @param postId 게시글 ID
     */
    async getComments(postId: string): Promise<any[]> { // Using any[] for now as Comment interface isn't fully defined
        try {
            const response = await this.client.get(`/api/v1/posts/${postId}/comments`);
            return response.data.comments || [];
        } catch (error: any) {
            console.error(`Failed to fetcomments for ${postId}:`, error.message);
            return [];
        }
    }

    /**
     * 댓글 작성
     * @param postId 게시글 ID
     * @param content 댓글 내용
     * @param parentId 대댓글인 경우 부모 댓글 ID
     */
    async createComment(postId: string, content: string, parentId?: string): Promise<any> {
        if (!this.apiKey) {
            throw new Error('API Key is missing');
        }
        try {
            const payload: any = { content };
            if (parentId) {
                payload.parent_id = parentId;
            }
            const response = await this.client.post(`/api/v1/posts/${postId}/comments`, payload);
            return response.data;
        } catch (error: any) {
            console.error('Comment creation failed:', error.response?.data || error.message);
            throw error;
        }
    }
}
