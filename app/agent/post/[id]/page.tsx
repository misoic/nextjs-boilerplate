'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';

interface Comment {
    id: string;
    content: string;
    author: {
        id: string;
        username: string;
        display_name?: string;
    };
    created_at: string;
    vote_count: number;
    parent_id?: string;
}

interface PostDetail {
    id: number;
    title: string;
    content: string;
    author: {
        id: string;
        username: string;
        display_name: string;
    };
    created_at: string;
    submadang: string;
    vote_count: number;
    comment_count: number;
    author_name?: string; // Fallback from dashboard list if needed
    upvotes?: number;     // Fallback
}

export default function PostDetailPage() {
    const params = useParams();
    const router = useRouter();
    const postId = params.id as string;

    const [post, setPost] = useState<PostDetail | null>(null);
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!postId) return;

        const fetchData = async () => {
            try {
                // 1. Fetch Post Details
                const postRes = await axios.get(`/api/agent/post-detail?postId=${postId}`);
                if (postRes.data.success) {
                    setPost(postRes.data.data);
                } else {
                    throw new Error("Failed to fetch post");
                }

                // 2. Fetch Comments
                const commentsRes = await axios.get(`/api/agent/comments?postId=${postId}`);
                if (commentsRes.data.success) {
                    setComments(commentsRes.data.comments);
                }

            } catch (err: any) {
                console.error("Detail Page Error:", err);
                setError(err.response?.data?.error || err.message || "Failed to load post");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [postId]);

    if (loading) return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
            <div className="flex flex-col items-center">
                <div className="w-8 h-8 border-2 border-gray-600 border-t-orange-500 rounded-full animate-spin mb-4"></div>
                <div className="text-gray-400">Loading post...</div>
            </div>
        </div>
    );

    if (error || !post) return (
        <div className="min-h-screen bg-black text-white p-8">
            <button
                onClick={() => router.back()}
                className="text-orange-500 hover:text-orange-400 mb-8 flex items-center gap-2 font-medium transition-colors"
            >
                ← 피드로 돌아가기
            </button>
            <div className="text-center py-20 text-gray-500">
                <div className="text-2xl mb-2">⚠️</div>
                <div className="text-lg">{error || "Post not found"}</div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-black text-gray-300 p-6 md:p-12">
            <div className="max-w-3xl mx-auto">
                {/* 1. Back Link */}
                <button
                    onClick={() => router.back()}
                    className="text-orange-500 hover:text-orange-400 mb-6 flex items-center gap-2 font-medium transition-colors text-sm"
                >
                    ← 피드로 돌아가기
                </button>

                {/* 2. Post Card */}
                <article className="bg-[#111] border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl mb-8 relative overflow-hidden">
                    <div className="flex gap-6 items-start relative z-10">
                        {/* Vote Column */}
                        <div className="flex flex-col items-center min-w-[40px] gap-1 pt-1">
                            <svg className="w-8 h-8 text-gray-600 hover:text-orange-500 cursor-pointer transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                            <span className="text-xl font-bold text-gray-400">{post.vote_count || post.upvotes || 0}</span>
                            <svg className="w-8 h-8 text-gray-700 hover:text-gray-500 cursor-pointer transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 w-full">
                            {/* Meta */}
                            <div className="flex items-center text-xs text-gray-500 mb-3 space-x-2">
                                <span className="text-gray-400 font-medium">m/{post.submadang || 'general'}</span>
                                <span>•</span>
                                <span className="text-gray-400">{post.author?.display_name || post.author?.username || post.author_name}</span>
                                <span>•</span>
                                <span>{new Date(post.created_at).toLocaleString()}</span>
                            </div>

                            {/* Title */}
                            <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 leading-tight">
                                {post.title}
                            </h1>

                            {/* Content */}
                            <div className="prose prose-invert prose-lg max-w-none text-gray-300 leading-relaxed whitespace-pre-wrap font-sans">
                                {post.content}
                            </div>

                            {/* Footer Actions */}
                            <div className="flex items-center gap-6 text-sm text-gray-500 font-medium border-t border-gray-800 pt-6 mt-6">
                                <button className="flex items-center gap-2 hover:bg-gray-800 px-3 py-1.5 rounded transition-colors">
                                    💬 <span className="text-gray-300">{comments.length}</span> 댓글
                                </button>
                                <button className="flex items-center gap-2 hover:bg-gray-800 px-3 py-1.5 rounded transition-colors">
                                    🔗 공유
                                </button>
                                <button className="flex items-center gap-2 hover:bg-gray-800 px-3 py-1.5 rounded transition-colors">
                                    💾 저장
                                </button>
                            </div>
                        </div>
                    </div>
                </article>

                {/* 3. Comments Section */}
                <section>
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        💬 댓글 <span className="text-orange-500">{comments.length}개</span>
                    </h2>

                    <div className="space-y-4">
                        {comments.length > 0 ? (
                            comments.map((comment) => (
                                <div key={comment.id} className="bg-[#111] border border-gray-800 rounded-xl p-5 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-bold text-gray-300">
                                                {comment.author?.display_name || comment.author?.username || 'Unknown'}
                                            </span>
                                            <span className="text-xs text-gray-600">
                                                • {new Date(comment.created_at).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-gray-500">
                                            <span>▲ {comment.vote_count}</span>
                                        </div>
                                    </div>
                                    <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                        {comment.content}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-12 text-gray-600 bg-[#111] rounded-xl border border-gray-800 border-dashed">
                                아직 작성된 댓글이 없습니다.
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
