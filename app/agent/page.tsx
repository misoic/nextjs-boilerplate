/**
 * @file app/agent/page.tsx
 * @description 봇마당 에이전트 대시보드 메인 페이지
 * 
 * [주요 기능]
 * 1. 에이전트 상태 및 통계 확인
 * 2. AI 게시글 초안 생성 (주제 입력 가능)
 * 3. 생성된 초안 편집 (제목, 본문, 게시판 카테고리 수정)
 * 4. 초안 삭제 및 재생성
 * 5. 최종 검토 후 봇마당 실시간 게시
 * 6. 내가 작성한 최근 피드 목록 조회 (로컬 DB 동기화 포함)
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Modal from '../components/Modal';

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
        downvotes: number;
        comment_count: number;
    }[];
    // unreadNotificationsCount: number; // Removed
    // recentNotifications: any[]; // Removed
    nextDraft?: {
        id: string;
        postData: {
            title: string;
            content: string;
            topic: string;
            submadang: string;
        };
    } | null;
    queueStats?: {
        total: number;
        pending: number;
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

    // Draft Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editContent, setEditContent] = useState('');

    const SUBMADANGS = [
        { id: 'tech', name: '기술토론', emoji: '💻' },
        { id: 'general', name: '자유게시판', emoji: '💬' },
        { id: 'vibecoding', name: '바이브코딩', emoji: '🎸' },
        { id: 'philosophy', name: '철학마당', emoji: '🤔' },
        { id: 'daily', name: '일상', emoji: '☕' },
        { id: 'showcase', name: '자랑하기', emoji: '✨' },
        { id: 'finance', name: '금융마당', emoji: '💰' },
        { id: 'korea', name: '한국마당', emoji: '🇰🇷' },
        { id: 'questions', name: '질문답변', emoji: '❓' },
        { id: 'edutech', name: '에듀테크', emoji: '📚' },
        { id: 'test', name: '테스트', emoji: '🧪' },
    ];

    // Sync draft state when dashboard updates
    useEffect(() => {
        if (dashboard?.nextDraft && !isEditing) {
            setEditTitle(dashboard.nextDraft.postData?.title || '');
            setEditContent(dashboard.nextDraft.postData?.content || '');
            setSubmadang(dashboard.nextDraft.postData?.submadang || 'general');
        }
    }, [dashboard, isEditing]);

    const [selectedPost, setSelectedPost] = useState<any>(null);

    const fetchDashboard = async (includePosts = false) => {
        try {
            const res = await axios.get(`/api/agent/dashboard?include_posts=${includePosts}`);
            if (res.data.success) {
                setDashboard(prev => {
                    // If we are loading posts, replace myPosts. 
                    // If not, keep existing myPosts if they exist, or use the empty array from response 
                    // (Actually response always has array, just empty if not requested).
                    // We should merge carefully.

                    const newData = res.data.data;

                    // If we requested posts, use them. If not, but we already have posts, keep them?
                    // Or follow the API strictly? API returns [] if include_posts=false.
                    // So if includePosts is false, we might overwrite existing posts with empty array.
                    // We need to handle this.

                    if (!includePosts && prev?.myPosts && prev.myPosts.length > 0) {
                        newData.myPosts = prev.myPosts;
                        newData.myPostsCount = prev.myPostsCount;
                    }

                    return newData;
                });
            }
        } catch (err: any) {
            // ... handle error
            console.error("Failed to fetch dashboard", err);
        } finally {
            setLoading(false);
        }
    };

    // Separate function to explicitly load posts
    const loadPosts = async () => {
        if (!dashboard) return;
        setStatus('loading_posts'); // Update status to show loading state
        try {
            const res = await axios.get('/api/agent/dashboard?include_posts=true');
            if (res.data.success) {
                setDashboard(prev => (!prev ? res.data.data : {
                    ...prev,
                    myPosts: res.data.data.myPosts,
                    myPostsCount: res.data.data.myPostsCount
                }));
            }
        } catch (error) {
            console.error(error);
            showAlert(`게시글을 불러오는데 실패했습니다: ${(error as any).response?.data?.error || (error as any).message || '알 수 없는 오류'}`, "로딩 오류");
        } finally {
            setStatus('idle');
        }
    };

    useEffect(() => {
        fetchDashboard(false); // Initial load: NO POSTS
        // Refresh every 30 seconds - logic remains, maybe refreshing posts should be manual?
        // Or keep refreshing dashboard but without posts to update queue stats.
        const interval = setInterval(() => fetchDashboard(false), 30000);
        return () => clearInterval(interval);
    }, []);

    // ...



    useEffect(() => {
        if (cooldown > 0) {
            const timer = setInterval(() => setCooldown(c => c - 1), 1000);
            return () => clearInterval(timer);
        }
    }, [cooldown]);

    // --- Draft Actions ---

    // 1. Generate Draft
    const generateDraft = async () => {
        if (cooldown > 0) return;
        setStatus('generating');
        try {
            // New Endpoint for Draft Generation
            const res = await axios.post('/api/agent/draft', {
                topic: topic || undefined
            });
            console.log(`📝 초안 생성 성공: ${res.data.data?.topic}`);
            setTopic('');
            // setCooldown(180); // Optional: Cooldown for generation? Maybe shorter now.
            await fetchDashboard();
        } catch (error: any) {
            console.error(`❌ 생성 오류: ${error.response?.data?.error || error.message}`);
            showAlert(`오류가 발생했습니다: ${error.response?.data?.error || error.message}`, "생성 실패");
        } finally {
            setStatus('idle');
        }
    };

    // 2. Save Draft (Update)
    const saveDraft = async () => {
        if (!dashboard?.nextDraft) return;
        setStatus('saving');
        try {
            await axios.put('/api/agent/draft', {
                id: dashboard.nextDraft.id,
                title: editTitle,
                content: editContent,
                submadang: submadang // Use state
            });
            setIsEditing(false); // Exit edit mode
            await fetchDashboard(); // Refresh to see updates (though local state is already there)
        } catch (error: any) {
            showAlert(`저장 실패: ${error.response?.data?.error || error.message}`, "저장 오류");
        } finally {
            setStatus('idle');
        }
    };

    // 4. Delete Draft (Updated with Modal)
    // (Moved below to use modal state)

    // --- Modal State ---
    const [modal, setModal] = useState<{
        isOpen: boolean;
        title?: string;
        message: string;
        type: 'confirm' | 'alert';
        onConfirm: () => void;
    }>({
        isOpen: false,
        message: '',
        type: 'alert',
        onConfirm: () => { },
    });

    const closeModal = () => {
        setModal(prev => ({ ...prev, isOpen: false }));
    };

    const showAlert = (message: string, title?: string) => {
        setModal({
            isOpen: true,
            title,
            message,
            type: 'alert',
            onConfirm: closeModal
        });
    };

    const showConfirm = (message: string, onConfirm: () => void, title?: string) => {
        setModal({
            isOpen: true,
            title,
            message,
            type: 'confirm',
            onConfirm: () => {
                onConfirm();
                closeModal();
            }
        });
    };

    // 4. Delete Draft (Updated with Modal)
    const deleteDraft = async () => {
        if (!dashboard?.nextDraft) return;

        showConfirm('정말 이 초안을 삭제하시겠습니까?', async () => {
            setStatus('deleting');
            try {
                await axios.delete(`/api/agent/draft?id=${dashboard.nextDraft!.id}`);
                await fetchDashboard();
            } catch (error: any) {
                showAlert(`삭제 실패: ${error.message}`);
            } finally {
                setStatus('idle');
            }
        }, '초안 삭제');
    };

    // ... (Other functions updated to use showAlert if needed, but primarily replacing delete) ...

    // 에러 발생 시 showAlert를 사용하도록 regenerateDraft 업데이트
    const regenerateDraft = async () => {
        if (!dashboard?.nextDraft) return;
        setStatus('regenerating');
        try {
            await axios.delete(`/api/agent/draft?id=${dashboard.nextDraft.id}`);
            const previousTitle = dashboard.nextDraft.postData?.topic;
            await axios.post('/api/agent/draft', { topic: previousTitle });
            await fetchDashboard();
        } catch (error: any) {
            showAlert(`재생성 실패: ${error.message}`);
        } finally {
            setStatus('idle');
        }
    };

    // 에러 발생 시 showAlert를 사용하도록 publishDraft 업데이트
    const publishDraft = async () => {
        if (!dashboard?.nextDraft) return;
        setStatus('publishing');
        try {
            await axios.post('/api/agent/draft/publish');
            setCooldown(180);
            await fetchDashboard();
        } catch (error: any) {
            showAlert(`게시 실패: ${error.message}`);
        } finally {
            setStatus('idle');
        }
    };

    // ...

    // 백그라운드 작업 수동 트리거
    const runAllTasks = async () => {
        if (status !== 'idle') return;
        setStatus('running_tasks');
        try {
            const res = await axios.post('/api/agent/run-all');
            console.log('✅ 수동 실행 결과:', res.data);
            await fetchDashboard();
        } catch (error: any) {
            console.error("수동 실행 실패:", error);
            showAlert(`실행 실패: ${error.message}`);
        } finally {
            setStatus('idle');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans">
                <div className="relative w-20 h-20 mb-6">
                    <div className="absolute inset-0 border-4 border-gray-800 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-orange-500 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-2xl">🤖</div>
                </div>
                <h2 className="text-xl font-bold text-gray-300 animate-pulse tracking-wide">에이전트 상황실 접속 중...</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-gray-200 font-sans selection:bg-orange-500 selection:text-white">
            <Modal
                isOpen={modal.isOpen}
                title={modal.title}
                message={modal.message}
                type={modal.type}
                onConfirm={modal.onConfirm}
                onCancel={closeModal}
            />
            <div className="max-w-4xl mx-auto p-6 space-y-8">
                {/* ... existing header ... */}

                {/* 1. 헤더 (Identity) */}
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

                    <div className="ml-auto flex items-center gap-3">
                        {/* 큐 컨트롤 제거됨 */}
                    </div>
                </header>

                {/* 2. 게시글 미리보기 및 액션 카드 (Post Preview & Action Card) */}
                <div className="bg-[#111] p-6 rounded-xl border border-gray-800 shadow-sm relative overflow-hidden">
                    {/* 배경 장식 */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>

                    {dashboard?.nextDraft ? (
                        // --- A. 초안 미리보기 / 편집 모드 ---
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="bg-orange-500 text-black text-xs font-bold px-2 py-1 rounded">PENDING DRAFT</span>
                                    {dashboard.nextDraft.postData?.submadang && (
                                        <span className="bg-gray-800 border border-gray-700 text-gray-300 text-xs font-medium px-2 py-1 rounded flex items-center gap-1">
                                            {SUBMADANGS.find(s => s.id === dashboard.nextDraft?.postData?.submadang)?.emoji}
                                            m/{dashboard.nextDraft.postData.submadang}
                                        </span>
                                    )}
                                    <span className="text-gray-500 text-xs uppercase tracking-wider">AI가 작성한 초안입니다</span>
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                    ID: {dashboard.nextDraft.id.slice(0, 8)}...
                                </div>
                            </div>

                            <div className="space-y-4">
                                {isEditing ? (
                                    <>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-sm text-gray-500">게시판 선택:</span>
                                            <select
                                                value={submadang}
                                                onChange={(e) => setSubmadang(e.target.value)}
                                                className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-orange-500"
                                            >
                                                {SUBMADANGS.map((sm) => (
                                                    <option key={sm.id} value={sm.id}>
                                                        {sm.emoji} {sm.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <input
                                            type="text"
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-lg font-bold text-white focus:outline-none focus:border-orange-500 transition-colors"
                                            placeholder="제목을 입력하세요"
                                        />
                                        <textarea
                                            value={editContent}
                                            onChange={(e) => setEditContent(e.target.value)}
                                            rows={8}
                                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-300 focus:outline-none focus:border-orange-500 transition-colors leading-relaxed resize-none"
                                            placeholder="내용을 입력하세요"
                                        />
                                    </>
                                ) : (
                                    <div className="bg-gray-900/50 rounded-lg p-5 border border-gray-800/50 flex flex-col items-center justify-center text-center min-h-[200px] space-y-3">
                                        <h3 className="text-xl font-bold text-gray-400">
                                            {dashboard.nextDraft.postData?.title || "새로운 영감을 기다리는 중... 💭"}
                                        </h3>
                                        <p className="text-gray-500 text-sm">
                                            {dashboard.nextDraft.postData?.content || "아직 작성된 내용이 없습니다.\n아래 '게시글 생성하기' 버튼을 눌러 멋진 글을 만들어보세요!"}
                                        </p>
                                    </div>
                                )}

                                {/* 제어 버튼 (Control Buttons) */}
                                <div className="flex flex-wrap items-center gap-3 pt-2">
                                    {/* 내용에 있는 경우: 기본 제어 */}
                                    {(dashboard.nextDraft.postData?.title || dashboard.nextDraft.postData?.content) ? (
                                        <>
                                            {!isEditing ? (
                                                <button
                                                    onClick={() => {
                                                        setIsEditing(true);
                                                        setEditTitle(dashboard.nextDraft?.postData?.title || '');
                                                        setEditContent(dashboard.nextDraft?.postData?.content || '');
                                                    }}
                                                    className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                >
                                                    ✏️ 수정하기
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={saveDraft}
                                                    disabled={status === 'saving'}
                                                    className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                                >
                                                    💾 저장하기
                                                </button>
                                            )}

                                            <button
                                                onClick={publishDraft}
                                                disabled={status !== 'idle' || isEditing}
                                                className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 disabled:cursor-not-allowed text-black px-6 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                                            >
                                                🚀 올리기
                                            </button>
                                        </>
                                    ) : (
                                        // 비었거나 깨진 경우: "재생성" 대신 "생성" 보여주기
                                        <button
                                            onClick={regenerateDraft}
                                            disabled={status !== 'idle'}
                                            className="bg-orange-500 hover:bg-orange-400 text-black px-6 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 animate-pulse"
                                        >
                                            {status === 'regenerating' ? (
                                                <>
                                                    <span className="animate-spin">⏳</span> 게시글 생성중...
                                                </>
                                            ) : (
                                                <>
                                                    ✍️ 게시글 생성하기
                                                </>
                                            )}
                                        </button>
                                    )}

                                    <div className="flex-1"></div>

                                    {/* 보조 재생성 버튼 (내용이 있을 때만 보임) */}
                                    {(dashboard.nextDraft.postData?.title || dashboard.nextDraft.postData?.content) && (
                                        <button
                                            onClick={regenerateDraft}
                                            disabled={status !== 'idle'}
                                            className="bg-gray-900 border border-gray-700 hover:bg-gray-800 text-gray-400 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                        >
                                            🔄 다시만들기
                                        </button>
                                    )}

                                    <button
                                        onClick={deleteDraft}
                                        disabled={status !== 'idle' || !(dashboard.nextDraft.postData?.title || dashboard.nextDraft.postData?.content)}
                                        className={`bg-gray-900 border border-gray-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${!(dashboard.nextDraft.postData?.title || dashboard.nextDraft.postData?.content)
                                            ? 'opacity-30 cursor-not-allowed text-gray-600'
                                            : 'text-gray-400 hover:text-red-500 hover:border-red-900 hover:bg-red-900/20'
                                            }`}
                                    >
                                        🗑️ 지우기
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // --- B. 생성 모드 (새 글 만들기) ---
                        <div className="relative z-10">
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
                                    onClick={generateDraft}
                                    disabled={status !== 'idle' || cooldown > 0}
                                    className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-all font-medium flex items-center justify-center gap-2"
                                >
                                    {cooldown > 0 ? (
                                        <span className="text-orange-500 font-mono">⏳ {Math.floor(cooldown / 60)}:{(cooldown % 60).toString().padStart(2, '0')} 남음</span>
                                    ) : (
                                        <>
                                            {status === 'generating' ? (
                                                <>
                                                    <span className="animate-spin">⏳</span> 게시글 생성중...
                                                </>
                                            ) : (
                                                <>
                                                    <span>✍️</span> {topic ? '이 주제로 게시글 생성하기' : '게시글 생성하기'}
                                                </>
                                            )}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. 내 피드 (My Post Feed) */}
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
                                    {/* 왼쪽: 투표 (Votes) */}
                                    <div className="flex flex-col items-center min-w-[40px] gap-1 pt-1">
                                        <div className="text-gray-600 group-hover:text-orange-500 transition-colors">▲</div>
                                        <span className="text-lg font-bold text-gray-400 group-hover:text-white transition-colors">{post.upvotes || 0}</span>
                                        <div className="text-gray-700 group-hover:text-gray-500 transition-colors">▼</div>
                                    </div>

                                    {/* 오른쪽: 내용 (Content) */}
                                    <div className="flex-1 min-w-0">
                                        {/* 메타 정보 */}
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

                                        {/* 제목 */}
                                        <h3 className="text-xl font-bold text-white mb-3 group-hover:text-orange-500 transition-colors line-clamp-1 leading-tight">
                                            {post.title}
                                        </h3>

                                        {/* 미리보기 (내용) */}
                                        {post.content && (
                                            <p className="text-base text-gray-400 line-clamp-2 mb-4 leading-relaxed font-light">
                                                {post.content}
                                            </p>
                                        )}

                                        {/* 푸터 */}
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
                            <div className="text-lg mb-4">게시글 목록이 비어있거나 로드되지 않았습니다.</div>
                            <button
                                onClick={loadPosts}
                                disabled={status === 'loading_posts'}
                                className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {status === 'loading_posts' ? '🔄 불러오는 중...' : '📜 게시글 불러오기'}
                            </button>
                        </div>
                    )}
                </div>

                {/* 4. 로그 제거됨 (사용자 요청) */}
            </div>
        </div>
    );
}
