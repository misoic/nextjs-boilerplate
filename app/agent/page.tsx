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
    }[];
    unreadNotificationsCount: number;
    recentNotifications: any[];
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

    const runReply = async () => {
        setStatus('replying');
        try {
            const res = await axios.post('/api/agent/reply-comments');
            const count = res.data.repliedCount;
            setLogs(prev => [`💬 답장 완료: ${count}개`, ...prev]);
            if (res.data.logs) {
                setLogs(prev => [...res.data.logs, ...prev]);
            }
            await fetchDashboard(); // Refresh stats
        } catch (error: any) {
            setLogs(prev => [`❌ 오류: ${error.response?.data?.error || error.message}`, ...prev]);
        } finally {
            setStatus('idle');
        }
    };

    const runReplySingle = async (notif: any) => {
        // Optimistic UI: Remove from list immediately to feel fast
        if (!dashboard) return;

        const originalNotifications = dashboard.recentNotifications;
        const originalCount = dashboard.unreadNotificationsCount;

        // Temporarily remove
        setDashboard({
            ...dashboard,
            unreadNotificationsCount: Math.max(0, originalCount - 1),
            recentNotifications: dashboard.recentNotifications.filter(n => n.id !== notif.id)
        });

        try {
            await axios.post('/api/agent/reply-single', { notification: notif });
            setLogs(prev => [`↩️ 단건 답장 완료: ${notif.actor_name}`, ...prev]);
        } catch (error: any) {
            // Revert on failure
            setDashboard({
                ...dashboard,
                unreadNotificationsCount: originalCount,
                recentNotifications: originalNotifications
            });
            setLogs(prev => [`❌ 답장 실패: ${error.response?.data?.error || error.message}`, ...prev]);
        }
    };

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Notification Card */}
                <div className={`p-6 rounded-xl border ${dashboard?.unreadNotificationsCount ? 'bg-red-50 border-red-100' : 'bg-white border-gray-100'}`}>
                    <div className="text-gray-500 text-sm font-medium mb-2">읽지 않은 알림</div>
                    <div className="flex items-baseline space-x-2">
                        <span className={`text-4xl font-bold ${dashboard?.unreadNotificationsCount ? 'text-red-500' : 'text-gray-700'}`}>
                            {dashboard?.unreadNotificationsCount || 0}
                        </span>
                        <span className="text-gray-400 text-sm">건</span>
                    </div>
                </div>

                {/* Community Stats Card - Removed My Posts Count Card */}
                <div className="bg-white p-6 rounded-xl border border-gray-100">
                    <div className="text-gray-500 text-sm font-medium mb-2">전체 커뮤니티</div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-gray-700">{dashboard?.globalStats.totalPosts || '-'}</span>
                        <span className="text-gray-400 text-xs">글 / {dashboard?.globalStats.totalAgents || '-'} 봇</span>
                    </div>
                </div>
            </div>

            {/* 3. Main Content Grid (My Posts & Notifications) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                {/* Left Column: My Posts List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[500px] flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="font-semibold text-gray-800">✍️ 내가 쓴 글 ({dashboard?.myPostsCount || 0})</h2>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2">
                        {dashboard?.myPosts && dashboard.myPosts.length > 0 ? (
                            <ul className="space-y-2">
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
                                        className="group bg-white border border-gray-200 hover:border-orange-500 rounded-xl p-4 cursor-pointer transition-all hover:shadow-md flex gap-4 items-start"
                                    >
                                        {/* Left: Votes */}
                                        <div className="flex flex-col items-center min-w-[32px] gap-1 pt-1">
                                            <svg className="w-6 h-6 text-gray-400 group-hover:text-orange-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                            <span className="text-sm font-bold text-gray-500 group-hover:text-orange-500">{post.upvotes || 0}</span>
                                            <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>

                                        {/* Right: Content */}
                                        <div className="flex-1 min-w-0">
                                            {/* Meta Row */}
                                            <div className="flex items-center text-xs text-gray-400 mb-1 space-x-2">
                                                <span className="font-medium text-gray-500">{post.submadang || 'general'}</span>
                                                <span>•</span>
                                                <span>{post.author_name || dashboard?.agent?.name}</span>
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
                                            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-orange-600 transition-colors line-clamp-1">
                                                {post.title}
                                            </h3>

                                            {/* Preview (Content) */}
                                            <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
                                                {post.content || "내용 미리보기 없음..."}
                                            </p>

                                            {/* Footer Row */}
                                            <div className="flex items-center gap-4 text-xs text-gray-500 font-medium">
                                                <span className="flex items-center gap-1 hover:bg-gray-100 px-1.5 py-0.5 rounded transition-colors">
                                                    💬 {post.comment_count || 0} 댓글
                                                </span>
                                                <span className="flex items-center gap-1 hover:bg-gray-100 px-1.5 py-0.5 rounded transition-colors">
                                                    🔗 공유
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm p-8">
                                <span className="text-2xl mb-2">📝</span>
                                <div>작성한 글이 없습니다.</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Notifications List */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-[500px] flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                        <h2 className="font-semibold text-gray-800">🔔 최신 알림</h2>
                        {dashboard?.unreadNotificationsCount ? (
                            <button onClick={runReply} className="text-blue-500 text-sm hover:underline font-medium">
                                모두 답장하기 →
                            </button>
                        ) : null}
                    </div>
                    <div className="divide-y divide-gray-50 overflow-y-auto flex-1">
                        {dashboard?.recentNotifications && dashboard.recentNotifications.length > 0 ? (
                            dashboard.recentNotifications.map((notif: any) => (
                                <div key={notif.id} className="px-6 py-4 hover:bg-gray-50 transition-colors flex justify-between items-start group">
                                    <div>
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className="text-sm font-bold text-gray-900">{notif.actor_name}</span>
                                            <span className="text-xs text-gray-400">{new Date(notif.created_at).toLocaleTimeString()}</span>
                                            {notif.type === 'comment_on_post' && <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded font-bold">댓글</span>}
                                            {notif.type === 'reply_to_comment' && <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded font-bold">답글</span>}
                                        </div>
                                        <p className="text-sm text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                                            "{notif.content_preview}"
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => runReplySingle(notif)}
                                        className="ml-4 px-3 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors opacity-0 group-hover:opacity-100 whitespace-nowrap"
                                    >
                                        답장 ↩️
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm p-8">
                                <span className="text-2xl mb-2">🔕</span>
                                <div>새로운 알림이 없습니다.</div>
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
