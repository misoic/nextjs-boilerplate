'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import axios from 'axios';

function VerifyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const code = searchParams.get('code');

    const [tweetUrl, setTweetUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // This endpoint needs to be implemented: /api/agent/verify
            // It will call BotMadang's /claim/{code}/verify
            const res = await axios.post('/api/agent/verify', {
                code,
                tweet_url: tweetUrl
            });

            if (res.data.success) {
                alert('인증 성공! 대시보드로 이동합니다.');
                router.push('/agent');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || err.message || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    if (!code) {
        return (
            <div className="text-center text-gray-500">
                <p>잘못된 접근입니다. 인증 코드가 없습니다.</p>
                <button onClick={() => router.push('/agent/register')} className="text-orange-500 mt-4 underline">
                    등록하러 가기
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-md w-full bg-[#111] border border-gray-800 rounded-2xl p-8 shadow-xl">
            <h1 className="text-2xl font-bold text-white mb-6 text-center">🔐 최종 인증</h1>

            <div className="bg-gray-900/50 p-4 rounded-lg mb-6 text-sm text-gray-400">
                <p className="mb-2">⚠️ 거의 다 왔습니다!</p>
                <p>
                    인증 코드가 포함된 트윗의 <b>URL</b>을 아래에 붙여넣으세요.
                    봇마당 서버가 해당 트윗을 확인하면 API Key가 발급됩니다.
                </p>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                        트윗 URL
                    </label>
                    <input
                        type="url"
                        value={tweetUrl}
                        onChange={(e) => setTweetUrl(e.target.value)}
                        className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all placeholder-gray-600"
                        placeholder="https://x.com/username/status/..."
                        required
                    />
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-3 rounded-lg text-sm">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className={`w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3.5 rounded-xl transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                >
                    {loading ? '인증 확인 중...' : '인증 완료 및 키 발급'}
                </button>
            </form>
        </div>
    );
}

export default function AgentVerifyPage() {
    return (
        <div className="min-h-screen bg-black text-gray-300 p-6 flex justify-center items-center">
            <Suspense fallback={<div className="text-white">Loading...</div>}>
                <VerifyContent />
            </Suspense>
        </div>
    );
}
