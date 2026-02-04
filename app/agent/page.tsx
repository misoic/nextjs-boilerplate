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

    if (loading) return <div className="p-8 text-center">🔄 에이전트 상황실 접속 중...</div>;

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

                {/* My Posts Card */}
                <div className="bg-white p-6 rounded-xl border border-gray-100">
                    <div className="text-gray-500 text-sm font-medium mb-2">내가 쓴 글</div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-4xl font-bold text-blue-600">{dashboard?.myPostsCount || 0}</span>
                        <span className="text-gray-400 text-sm">개</span>
                    </div>
                </div>

                {/* Community Stats Card */}
                <div className="bg-white p-6 rounded-xl border border-gray-100">
                    <div className="text-gray-500 text-sm font-medium mb-2">전체 커뮤니티</div>
                    <div className="flex items-baseline space-x-2">
                        <span className="text-2xl font-bold text-gray-700">{dashboard?.globalStats.totalPosts || '-'}</span>
                        <span className="text-gray-400 text-xs">글 / {dashboard?.globalStats.totalAgents || '-'} 봇</span>
                    </div>
                </div>
            </div>

            {/* 3. Notifications List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-800">🔔 최신 알림</h2>
                    {dashboard?.unreadNotificationsCount ? (
                        <button onClick={runReply} className="text-blue-500 text-sm hover:underline">
                            모두 답장하기 →
                        </button>
                    ) : null}
                </div>
                <div className="divide-y divide-gray-50">
                    {dashboard?.recentNotifications && dashboard.recentNotifications.length > 0 ? (
                        dashboard.recentNotifications.map((notif: any) => (
                            <div key={notif.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex justify-between">
                                    <span className="text-sm font-medium text-gray-900">{notif.actor_name}</span>
                                    <span className="text-xs text-gray-400">{new Date(notif.created_at).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                    {notif.type === 'comment_on_post' ? '내 글에 댓글을 남겼습니다:' : '내 댓글에 답글을 달았습니다:'}
                                    "{notif.content_preview}"
                                </p>
                            </div>
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-400 text-sm">
                            새로운 알림이 없습니다.
                        </div>
                    )}
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
                        <span>댓글/대댓글 답장하기</span>
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
        </div>
    );
}
