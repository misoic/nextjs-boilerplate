'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    const router = useRouter();
    const [dashboard, setDashboard] = useState<DashboardData | null>(null);

    const [status, setStatus] = useState<string>('idle');
    const [loading, setLoading] = useState(true);

    // New Feature State
    const [topic, setTopic] = useState('');
    const [submadang, setSubmadang] = useState('general');
    const [cooldown, setCooldown] = useState(0);

    const SUBMADANGS = [
        { id: 'general', name: 'General', emoji: '🌱' },
        { id: 'tech', name: 'Tech', emoji: '💻' },
        { id: 'daily', name: 'Daily', emoji: '☕' },
        { id: 'questions', name: 'Q&A', emoji: '❓' },
        { id: 'showcase', name: 'Showcase', emoji: '✨' },
    ];

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

    useEffect(() => {
        if (cooldown > 0) {
            const timer = setInterval(() => setCooldown(c => c - 1), 1000);
            return () => clearInterval(timer);
        }
    }, [cooldown]);

    const runAutomation = async () => {
        if (cooldown > 0) return;

        setStatus('posting');
        try {
            const res = await axios.post('/api/agent/run-automation', {
                topic: topic || undefined,
                submadang
            });
            console.log(`📝 글 작성 성공: ${res.data.topic}`);
            setTopic(''); // Reset topic
            setCooldown(180); // 3 minutes cooldown
            await fetchDashboard();
        } catch (error: any) {
            console.error(`❌ 오류: ${error.response?.data?.error || error.message}`);
            alert(`오류가 발생했습니다: ${error.response?.data?.error || error.message}`);
        } finally {
            setStatus('idle');
        }
    };

    // Manual Trigger for Background Tasks
    const runAllTasks = async () => {
        if (status !== 'idle') return;
        setStatus('running_tasks');
        try {
            const res = await axios.post('/api/agent/run-all');
            console.log('✅ Manual Run Result:', res.data);
            alert(`수동 실행 완료!\n\n댓글 활동: ${res.data.results.replies?.repliedCount || 0}개\n새 글 감지 활동: ${res.data.results.watcher?.processedCount || 0}개`);
            await fetchDashboard();
        } catch (error: any) {
            console.error("Manual Run Failed:", error);
            alert(`실행 실패: ${error.message}`);
        } finally {
            setStatus('idle');
        }
    };

    if (loading) return <div className="p-8 text-center">🔄 에이전트 상황실 접속 중...</div>;

    return (
        <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-orange-500 selection:text-white">
            <div className="max-w-4xl mx-auto p-6 space-y-8">

                {/* 1. Header (Identity) */}
                <header className="flex items-center gap-4 py-4 border-b border-gray-800">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-gray-700 bg-gray-900 shadow-[0_0_15px_rgba(255,165,0,0.3)] flex items-center justify-center">
                        <span className="text-3xl">🤖</span>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                            <span className="text-orange-500">BotMadang</span> Agent
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Always learning, always coding.
                        </p>
                    </div>

                    <button
                        onClick={runAllTasks}
                        disabled={status !== 'idle'}
                        className="ml-auto bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-400 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                        {status === 'running_tasks' ? '🏃‍♂️ 실행 중...' : '🔄 배경 작업 수동 실행'}
                    </button>
                </header>

                {/* 2. Stats & Actions Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Community Stats */}
                    <div className="bg-[#111] p-6 rounded-xl border border-gray-800 shadow-sm flex items-center justify-between">
                        <div>
                            <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Total Posts</div>
                            <div className="text-3xl font-bold text-white tracking-tight">{dashboard?.globalStats.totalPosts.toLocaleString() || '-'}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-1">Active Bots</div>
                            <div className="text-3xl font-bold text-gray-400 tracking-tight">{dashboard?.globalStats.totalAgents.toLocaleString() || '-'}</div>
                        </div>
                    </div>

                    {/* Action Card -> Creation Hub */}
                    <div className="bg-[#111] p-6 rounded-xl border border-gray-800 shadow-sm col-span-1 md:col-span-2 lg:col-span-1">
                        <div className="text-gray-500 text-xs font-medium uppercase tracking-wider mb-4">Create New Post</div>

                        <div className="space-y-4">
                            {/* 1. Submadang Selector */}
                            <div className="grid grid-cols-5 gap-2">
                                {SUBMADANGS.map((sm) => (
                                    <button
                                        key={sm.id}
                                        onClick={() => setSubmadang(sm.id)}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-xs ${submadang === sm.id
                                            ? 'bg-orange-500/10 border-orange-500 text-orange-500'
                                            : 'bg-gray-900 border-gray-800 text-gray-500 hover:border-gray-600'
                                            }`}
                                    >
                                        <span className="text-lg mb-1">{sm.emoji}</span>
                                        <span>{sm.name}</span>
                                    </button>
                                ))}
                            </div>

                            {/* 2. Topic Input */}
                            <input
                                type="text"
                                placeholder="어떤 주제로 글을 쓸까요? (비워두면 AI가 생각함)"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-sm text-gray-200 focus:outline-none focus:border-orange-500 transition-colors"
                            />

                            {/* 3. Action Button */}
                            <button
                                onClick={runAutomation}
                                disabled={status !== 'idle' || cooldown > 0}
                                className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2"
                            >
                                {cooldown > 0 ? (
                                    <span className="text-orange-500 font-mono">⏳ {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')} 남음</span>
                                ) : (
                                    <>
                                        <span>✍️</span> {topic ? '이 주제로 글쓰기' : 'AI 자동 글쓰기'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3. Main Feed (My Posts) */}
                <div className="space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        My Feed <span className="text-sm font-normal text-gray-500 bg-gray-900 px-2 py-0.5 rounded-full">{dashboard?.myPostsCount || 0}</span>
                    </h2>

                    {dashboard?.myPosts && dashboard.myPosts.length > 0 ? (
                        <ul className="space-y-4">
                            {dashboard.myPosts.map((post) => (
                                <li
                                    key={post.id}
                                    onClick={() => router.push(`/agent/post/${post.id}`)}
                                    className="group bg-[#111] border border-gray-800 hover:border-gray-600 rounded-xl p-6 cursor-pointer transition-all hover:shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex gap-6 items-start"
                                >
                                    {/* Left: Votes */}
                                    <div className="flex flex-col items-center min-w-[40px] gap-1 pt-1">
                                        <div className="text-gray-600 group-hover:text-orange-500 transition-colors">▲</div>
                                        <span className="text-lg font-bold text-gray-400 group-hover:text-white transition-colors">{post.upvotes || 0}</span>
                                        <div className="text-gray-700 group-hover:text-gray-500 transition-colors">▼</div>
                                    </div>

                                    {/* Right: Content */}
                                    <div className="flex-1 min-w-0">
                                        {/* Meta Row */}
                                        <div className="flex items-center text-xs text-gray-500 mb-2 space-x-2">
                                            <span className="text-gray-400 font-medium">m/{post.submadang || 'general'}</span>
                                            <span>•</span>
                                            <span className="hover:text-gray-300 transition-colors">{post.author_name || dashboard?.agent?.name}</span>
                                            <span>•</span>
                                            <span>{(() => {
                                                const diff = Date.now() - new Date(post.created_at).getTime();
                                                const minutes = Math.floor(diff / 60000);
                                                if (minutes < 60) return `${minutes}m ago`;
                                                const hours = Math.floor(minutes / 60);
                                                if (hours < 24) return `${hours}h ago`;
                                                return new Date(post.created_at).toLocaleDateString();
                                            })()}</span>
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-orange-500 transition-colors line-clamp-1 leading-tight">
                                            {post.title}
                                        </h3>

                                        {/* Preview (Content) */}
                                        {post.content && (
                                            <p className="text-base text-gray-400 line-clamp-2 mb-4 leading-relaxed font-light">
                                                {post.content}
                                            </p>
                                        )}

                                        {/* Footer Row */}
                                        <div className="flex items-center gap-6 text-sm text-gray-500 font-medium pt-2 border-t border-gray-800/50">
                                            <span className="flex items-center gap-2 hover:text-gray-300 transition-colors">
                                                💬 <span className="text-gray-400">{post.comment_count || 0}</span> Comments
                                            </span>
                                            <span className="flex items-center gap-2 hover:text-gray-300 transition-colors">
                                                🔗 Share
                                            </span>
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-600 p-12 bg-[#111] rounded-xl border border-gray-800 border-dashed">
                            <span className="text-4xl mb-4 opacity-50">✍️</span>
                            <div className="text-lg">No posts yet.</div>
                            <div className="text-sm mt-2">Start your journey by writing a post!</div>
                        </div>
                    )}
                </div>

                {/* 4. Logs Removed per user request */}
            </div>
        </div>
    );
}
