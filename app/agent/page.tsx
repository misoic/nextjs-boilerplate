'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';

interface DashboardData {
    agent: {
        id: string;
        name: string;
        claim_url: string;
    };
    myPostsCount: number;
    myPosts: {
        id: number;
        title: string;
        content: string;
        created_at: string;
        submadang: string;
        author_name: string;
        upvotes: number;
        comment_count: number;
    }[];
    // unreadNotificationsCount: number; // Removed
    // recentNotifications: any[]; // Removed
    globalStats: {
        totalPosts: number;
        totalAgents: number;
    };
}

export default function AgentPage() {
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);
    const [logs, setLogs] = useState<string[]>([]);
    const [status, setStatus] = useState<string>('idle');
    const [loading, setLoading] = useState(true);

    const [selectedPost, setSelectedPost] = useState<any>(null);

    const fetchDashboard = async () => {
        try {
            const res = await axios.get('/api/agent/dashboard');
            if (res.data.success) {
                setDashboard(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch dashboard", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboard();
        // Refresh every 30 seconds
        const interval = setInterval(fetchDashboard, 30000);
        return () => clearInterval(interval);
    }, []);

    const runAutomation = async () => {
        setStatus('posting');
        try {
            const res = await axios.post('/api/agent/run-automation');
            setLogs(prev => [`📝 글 작성 성공: ${res.data.topic}`, ...prev]);
            await fetchDashboard(); // Refresh stats
        } catch (error: any) {
            setLogs(prev => [`❌ 오류: ${error.response?.data?.error || error.message}`, ...prev]);
        } finally {
            setStatus('idle');
        }
    };

    // const runReply removed
    // const runReplySingle removed

    if (loading) return <div className="p-8 text-center">🔄 에이전트 상황실 접속 중...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8 relative">
            {/* 1. Header */}
            <header className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">
                        {dashboard?.agent ? `안녕하세요, ${dashboard.agent.name}님! 👋` : '에이전트 상황실'}
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">
                        Agent ID: <span className="font-mono text-gray-400">{dashboard?.agent?.id}</span>
                    </p>
                </div>
                <div className="flex space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${status === 'idle' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {status === 'idle' ? '🟢 대기 중' : '🟡 작업 중...'}
                    </span>
                </div>
            </header>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-1 gap-4">
                {/* Community Stats Card - Removed Notification Card, Expanded Grid used to be 3 cols */}
                <div className="bg-white p-6 rounded-xl border border-gray-100">
                    <div className="text-gray-500 text-sm font-medium mb-2">전체 커뮤니티</div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-gray-700">{dashboard?.globalStats.totalPosts || '-'}</span>
                        <span className="text-gray-400 text-xs">글 / {dashboard?.globalStats.totalAgents || '-'} 봇</span>
                    </div>
                </div>

                {/* My Posts Count Mini Card - Optional, maybe keep as simple stat or removing as requested?
                    Wait, user said "Red card remove", "List remove".
                    Actually, let's keep Community Stats and maybe just make it cleaner.
                    Let's just keep Community Stats for now as the top bar or remove top bar entirely?
                    User said "This two screens remove" pointing to Notification Card and List.
                    Left "Community Stats" remains. Use full width or keep simple.
                 */}
            </div>

            {/* 3. Main Content Grid (My Posts Only - Full Width) */}
            <div className="grid grid-cols-1 gap-8">

                {/* My Posts List - Full Width Feed */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden min-h-[500px] flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="font-semibold text-gray-800">✍️ 내 피드 ({dashboard?.myPostsCount || 0})</h2>
                        <button
                            onClick={runAutomation}
                            disabled={status !== 'idle'}
                            className="text-sm bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center space-x-2"
                        >
                            <span>📝</span>
                            <span>새 글 작성</span>
                        </button>
                    </div>
                    <div className="overflow-y-auto flex-1 p-4 bg-gray-50">
                        {dashboard?.myPosts && dashboard.myPosts.length > 0 ? (
                            <ul className="space-y-4 max-w-3xl mx-auto">
                                {dashboard.myPosts.map((post) => (
                                    <li
                                        key={post.id}
                                        onClick={async () => {
                                            setSelectedPost(post);
                                            // Fetch content logic (same as before)
                                            try {
                                                const res = await axios.get(`/api/agent/post-detail?postId=${post.id}`);
                                                if (res.data.success) {
                                                    setSelectedPost((prev: any) => ({ ...prev, content: res.data.data.content }));
                                                }
                                            } catch (err) {
                                                setSelectedPost((prev: any) => ({ ...prev, content: "⚠️ 본문 내용을 가져올 수 없습니다. (너무 오래된 글이거나 삭제되었음)" }));
                                            }
                                        }}
                                        className="group bg-white border border-gray-200 hover:border-orange-500 rounded-xl p-6 cursor-pointer transition-all hover:shadow-lg flex gap-6 items-start"
                                    >
                                        {/* Left: Votes */}
                                        <div className="flex flex-col items-center min-w-[40px] gap-1 pt-1">
                                            <svg className="w-8 h-8 text-gray-300 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                            <span className="text-lg font-bold text-gray-600 group-hover:text-orange-500">{post.upvotes || 0}</span>
                                            <svg className="w-8 h-8 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>

                                        {/* Right: Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Meta Row */}
                                            <div className="flex items-center text-sm text-gray-400 mb-2 space-x-2">
                                                <span className="font-bold text-gray-600 px-2 py-0.5 bg-gray-100 rounded">{post.submadang || 'general'}</span>
                                                <span>•</span>
                                                <span className="text-gray-600">{post.author_name || dashboard?.agent?.name}</span>
                                                <span>•</span>
                                                <span>{(() => {
                                                    const diff = Date.now() - new Date(post.created_at).getTime();
                                                    const minutes = Math.floor(diff / 60000);
                                                    if (minutes < 60) return `${minutes}분 전`;
                                                    const hours = Math.floor(minutes / 60);
                                                    if (hours < 24) return `${hours}시간 전`;
                                                    return new Date(post.created_at).toLocaleDateString();
                                                })()}</span>
                                            </div>

                                            {/* Title */}
                                            <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition-colors line-clamp-1">
                                                {post.title}
                                            </h3>

                                            {/* Preview (Content) */}
                                            <p className="text-base text-gray-600 line-clamp-3 mb-4 leading-relaxed">
                                                {post.content || "내용 미리보기 없음..."}
                                            </p>

                                            {/* Footer Row */}
                                            <div className="flex items-center gap-6 text-sm text-gray-500 font-medium border-t border-gray-100 pt-3">
                                                <span className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded transition-colors">
                                                    💬 <span className="text-gray-700">{post.comment_count || 0}</span> 댓글
                                                </span>
                                                <span className="flex items-center gap-2 hover:bg-gray-50 px-2 py-1 rounded transition-colors">
                                                    🔗 공유하기
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm p-8">
                                <span className="text-4xl mb-4">✍️</span>
                                <div className="text-lg">아직 작성한 글이 없습니다.</div>
                                <div className="text-sm text-gray-400 mt-2">'새 글 작성' 버튼을 눌러보세요!</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 4. Controls & Log */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Control Panel */}
                <div className="space-y-4">
                    <h2 className="font-semibold text-gray-800">⚙️ 수동 제어</h2>
                    <button
                        onClick={runAutomation}
                        disabled={status !== 'idle'}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                    >
                        <span>📝</span>
                        <span>새 글 작성하기</span>
                    </button>
                    <button
                        onClick={runReply}
                        disabled={status !== 'idle'}
                        className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                    >
                        <span>💬</span>
                        <span>전체 답장하기 (⚠️ 10초 간격)</span>
                    </button>
                </div>

                {/* Logs */}
                <div className="space-y-4">
                    <h2 className="font-semibold text-gray-800">📜 활동 로그</h2>
                    <div className="bg-gray-900 text-gray-200 p-4 rounded-xl h-48 overflow-y-auto text-sm font-mono space-y-2">
                        {logs.length === 0 ? (
                            <div className="text-gray-600 italic">로그 대기 중...</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="break-all border-l-2 border-gray-700 pl-2">
                                    {log}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Post Detail Modal */}
            {selectedPost && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setSelectedPost(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">{selectedPost.title}</h3>
                                <div className="text-sm text-gray-500 mt-2 flex items-center gap-2">
                                    <span>{new Date(selectedPost.created_at).toLocaleString()}</span>
                                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{selectedPost.submadang}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedPost(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                ✕
                            </button>
                        </div>
                        <div className="p-8 overflow-y-auto prose max-w-none">
                            <div className="whitespace-pre-wrap text-gray-800 leading-relaxed font-sans">
                                {selectedPost.content || (
                                    <div className="flex items-center justify-center py-12 text-gray-400 space-x-2">
                                        <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                        <span>내용 불러오는 중...</span>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                            <button
                                onClick={() => setSelectedPost(null)}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
