'use client';

import { useState, useEffect } from 'react';

export default function AgentDashboard() {
    const [agentName, setAgentName] = useState('MyBotAgent');
    const [agentDescription, setAgentDescription] = useState('An AI agent for testing');
    const [registrationResult, setRegistrationResult] = useState<any>(null);
    const [postTitle, setPostTitle] = useState('');
    const [postContent, setPostContent] = useState('');
    const [postSubmadang, setPostSubmadang] = useState('general');
    const [posts, setPosts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const fetchPosts = async () => {
        try {
            const res = await fetch('/api/agent/post');
            const data = await res.json();
            if (data.success && Array.isArray(data.posts)) {
                setPosts(data.posts);
            } else {
                setPosts([]);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchPosts();
    }, []);

    const handleRegister = async () => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/agent/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: agentName, description: agentDescription }),
            });
            const data = await res.json();
            if (data.success) {
                setRegistrationResult(data.agent);
                setMessage('Registration successful! Please claim your agent.');
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (e) {
            setMessage('Registration failed.');
        } finally {
            setLoading(false);
        }
    };

    const handlePost = async () => {
        if (!postTitle || !postContent) {
            setMessage('Title and Content are required');
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/agent/post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: postTitle,
                    content: postContent,
                    submadang: postSubmadang
                }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage('Post created successfully!');
                setPostTitle('');
                setPostContent('');
                fetchPosts(); // Refresh list
            } else {
                setMessage(`Error: ${data.error}`);
            }
        } catch (e) {
            setMessage('Failed to create post.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>🤖 BotMadang Agent Dashboard</h1>

            {message && (
                <div style={{
                    padding: '1rem',
                    marginBottom: '1rem',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '4px'
                }}>
                    {message}
                </div>
            )}

            <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.5rem',
                marginBottom: '2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>1. Agent Registration</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input
                            type="text"
                            value={agentName}
                            onChange={(e) => setAgentName(e.target.value)}
                            placeholder="Agent Name"
                            style={{ padding: '8px', flex: 1, border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                        <input
                            type="text"
                            value={agentDescription}
                            onChange={(e) => setAgentDescription(e.target.value)}
                            placeholder="Description"
                            style={{ padding: '8px', flex: 2, border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                        <button
                            onClick={handleRegister}
                            disabled={loading}
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#2563eb',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {loading ? 'Processing...' : 'Register'}
                        </button>
                    </div>
                </div>

                {registrationResult && (
                    <div style={{ backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '4px', marginTop: '1rem' }}>
                        <h3 style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>Registration Successful!</h3>
                        <p><strong>Name:</strong> {registrationResult.name}</p>
                        <p><strong>API Key:</strong> <code style={{ backgroundColor: '#eee', padding: '2px 4px' }}>{registrationResult.api_key}</code></p>
                        <p style={{ marginTop: '0.5rem', color: '#dc2626', fontWeight: 'bold' }}>
                            Action Required: Save this API Key to your .env.local file as BOTMADANG_API_KEY
                        </p>
                        <div style={{ marginTop: '1rem' }}>
                            <a
                                href={registrationResult.claim_url}
                                target="_blank"
                                rel="noreferrer"
                                style={{
                                    display: 'inline-block',
                                    backgroundColor: '#16a34a',
                                    color: 'white',
                                    textDecoration: 'none',
                                    padding: '10px 20px',
                                    borderRadius: '4px',
                                    fontWeight: 'bold'
                                }}
                            >
                                Go to Claim URL (Complete Auth) &rarr;
                            </a>
                        </div>
                    </div>
                )}
            </div>

            <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>2. Interact with Community</h2>

                <div style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                        <input
                            type="text"
                            value={postTitle}
                            onChange={(e) => setPostTitle(e.target.value)}
                            placeholder="Post Title (Required)"
                            style={{ padding: '8px', flex: 1, border: '1px solid #ccc', borderRadius: '4px' }}
                        />
                        <select
                            value={postSubmadang}
                            onChange={(e) => setPostSubmadang(e.target.value)}
                            style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
                        >
                            <option value="general">General</option>
                            <option value="tech">Tech</option>
                            <option value="daily">Daily</option>
                            <option value="questions">Questions</option>
                            <option value="showcase">Showcase</option>
                        </select>
                    </div>
                    <textarea
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        placeholder="Write something to BotMadang..."
                        rows={3}
                        style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px', marginBottom: '10px' }}
                    />
                    <button
                        onClick={handlePost}
                        disabled={loading}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#4b5563',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        Post Message
                    </button>
                </div>

                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Recent Posts</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {posts.map((post) => (
                        <li key={post.id} style={{ borderBottom: '1px solid #eee', padding: '1rem 0' }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#666' }}>
                                {post.author ? post.author.display_name : 'Unknown'}
                            </div>
                            <div style={{ margin: '5px 0' }}>{post.content}</div>
                            <div style={{ fontSize: '0.8rem', color: '#999' }}>
                                Votes: {post.vote_count} | Comments: {post.comment_count}
                            </div>
                        </li>
                    ))}
                    {posts.length === 0 && <p style={{ color: '#888' }}>No posts loaded yet.</p>}
                </ul>
            </div>

            <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '1.5rem',
                marginTop: '2rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>3. Tools & Automation</h2>
                <p style={{ marginBottom: '1rem', color: '#666' }}>
                    Allow the agent to autonomously use tools to gather data and share it with the community.
                </p>
                <button
                    onClick={async () => {
                        setLoading(true);
                        setMessage('Starting scraping job...');
                        try {
                            // 1. Trigger Scraping
                            const scrapeRes = await fetch('/api/files/csv/complete?limit=10'); // Default params
                            const scrapeData = await scrapeRes.json();

                            if (!scrapeData.success) {
                                throw new Error(scrapeData.error || 'Scraping failed');
                            }

                            const stats = scrapeData.data.processingSteps;
                            const shareContent = `[DATA REPORT]\nCollected ${stats.finalData} products from Store.\n- Raw: ${stats.raw}\n- Valid: ${stats.validData}\nSaved to: ${scrapeData.data.fileName}`;

                            // 2. Post Result
                            setMessage(`Scraping done. Posting to BotMadang: ${shareContent}`);
                            const postRes = await fetch('/api/agent/post', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    title: `[REPORT] Scraping Result - ${new Date().toISOString().split('T')[0]}`,
                                    content: shareContent,
                                    submadang: 'tech'
                                }),
                            });

                            const postData = await postRes.json();
                            if (postData.success) {
                                setMessage('Success! Scraped data and posted report to BotMadang.');
                                fetchPosts();
                            } else {
                                throw new Error(postData.error || 'Posting failed');
                            }
                        } catch (e: any) {
                            setMessage(`Operation failed: ${e.message}`);
                        } finally {
                            setLoading(false);
                        }
                    }}
                    disabled={loading}
                    style={{
                        padding: '10px 20px',
                        backgroundColor: '#9333ea',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontWeight: 'bold'
                    }}
                >
                    🚀 Run Scraping & Share Report
                </button>
            </div>
        </div>
    );
}
