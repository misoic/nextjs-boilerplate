
"use client";

import { useState } from 'react';

export default function AgentPage() {
    const [status, setStatus] = useState<'idle' | 'scraping' | 'analyzing' | 'posting' | 'done' | 'error'>('idle');
    const [logs, setLogs] = useState<string[]>([]);
    const [result, setResult] = useState<any>(null);
    const [agentInfo, setAgentInfo] = useState<any>(null);

    const addLog = (message: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    };

    const checkAgent = async () => {
        try {
            const response = await fetch('/api/agent/me');
            const data = await response.json();
            if (data.success) {
                setAgentInfo(data.agent);
                addLog(`✅ 에이전트 정보 확인: ${data.agent.name}`);
            } else {
                addLog(`❌ 에이전트 정보 확인 실패: ${data.error}`);
            }
        } catch (error: any) {
            addLog(`❌ 에이전트 정보 확인 오류: ${error.message}`);
        }
    };

    const runAutomation = async () => {
        setStatus('scraping');
        setLogs([]);
        setResult(null);
        addLog("🧠 자율 사고 시작: 주제 선정 및 글쓰기 중...");

        try {
            // For better UX, we could have separate API calls for each step, 
            // but for now we are calling the all-in-one automation route.
            // If the route takes too long (over 60s), we might need to break it down later.

            const response = await fetch('/api/agent/run-automation', {
                method: 'POST',
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.details ? `${errorData.error}: ${JSON.stringify(errorData.details)}` : errorData.error || "자동화 실행 실패");
            }

            const data = await response.json();

            if (data.success) {
                setStatus('done');
                addLog("자동화 완료! 봇마당에 글이 등록되었습니다.");
                setResult(data);
            } else {
                throw new Error(data.error || "알 수 없는 오류");
            }

        } catch (error: any) {
            console.error(error);
            setStatus('error');
            addLog(`오류 발생: ${error.message}`);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        에이전트 컨트롤 패널
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        자율 에이전트에게 작업을 지시하세요.
                    </p>
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-medium text-gray-700">📌 내 에이전트 정보</h3>
                        <button
                            onClick={checkAgent}
                            className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-full transition-colors"
                        >
                            정보 확인
                        </button>
                    </div>

                    {agentInfo ? (
                        <div className="text-sm">
                            <p className="text-gray-900 font-bold">닉네임: {agentInfo.name}</p>
                            <p className="text-gray-500 text-xs mt-1">ID: {agentInfo.id}</p>
                        </div>
                    ) : (
                        <p className="text-xs text-gray-400">아직 정보를 불러오지 않았습니다.</p>
                    )}
                </div>

                <div className="space-y-6">
                    <button
                        onClick={runAutomation}
                        disabled={status !== 'idle' && status !== 'done' && status !== 'error'}
                        className={`group relative w-full flex justify-center py-4 px-4 border border-transparent text-lg font-medium rounded-md text-white 
                        ${status === 'idle' || status === 'done' || status === 'error'
                                ? 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
                                : 'bg-purple-400 cursor-not-allowed'}
                        focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-200 transform hover:scale-[1.02]`}
                    >
                        {status === 'idle' && "🧠 자율 사고 실행 (지금 바로 생각하기)"}
                        {status === 'scraping' && "🤔 고민 중... (주제 선정 & 글쓰기)"}
                        {status === 'done' && "✅ 완료! (봇마당 등록 성공)"}
                        {status === 'error' && "❌ 오류 발생 (다시 시도)"}
                    </button>

                    <div className="bg-gray-900 rounded-lg p-4 font-mono text-sm h-64 overflow-y-auto">
                        <div className="text-gray-400 mb-2 border-b border-gray-700 pb-1">System Logs</div>
                        {logs.length === 0 && <span className="text-gray-600">대기 중...</span>}
                        {logs.map((log, index) => (
                            <div key={index} className="text-green-400 mb-1">
                                {log}
                            </div>
                        ))}
                    </div>

                    {result && (
                        <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200">
                            <h3 className="text-lg font-medium text-green-900">결과 리포트</h3>
                            <div className="mt-2 text-sm text-green-700">
                                <p>총 상품 수: {result.steps?.scraping?.count}개</p>
                                <p>포스트 ID: {result.steps?.posting?.postId}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
