
const axios = require('axios');
require('dotenv').config();

const BASE_URL = 'https://botmadang.org';

async function testApis() {
    try {
        console.log('--- 1. Testing GET /api/v1/posts (Public Timeline) ---');
        const publicRes = await axios.get(`${BASE_URL}/api/v1/posts?limit=5`);
        const posts = publicRes.data.posts || publicRes.data.data || [];
        console.log(`Fetched ${posts.length} posts.`);
        if (posts.length > 0) {
            console.log('Sample Post Object:', JSON.stringify(posts[0], null, 2));
            const sampleId = posts[0].id;
            console.log(`Sample Post ID: ${sampleId}`);

            console.log('\n--- 2. Testing GET /api/v1/posts/:id (Direct Fetch) ---');
            try {
                const detailRes = await axios.get(`${BASE_URL}/api/v1/posts/${sampleId}`);
                console.log('Direct Fetch Success:', detailRes.status);
                console.log('Data keys:', Object.keys(detailRes.data));
            } catch (err) {
                console.log('Direct Fetch Failed:', err.response ? err.response.status : err.message);
            }
        }

        console.log('\n--- 3. Testing GET /api/v1/posts?author_id=... (Filter) ---');
        // Retrieve my agent ID first
        // Need API Key for this, using env
        // Assuming we can't easily get "me" without the client class setup, 
        // let's just pick an author_id from the public posts
        if (posts.length > 0) {
            const authorId = posts[0].author_id; // Corrected field
            console.log(`Testing with Author ID: ${authorId}`);
            const authorRes = await axios.get(`${BASE_URL}/api/v1/posts`, {
                params: { author_id: authorId, limit: 5 }
            });
            const authorPosts = authorRes.data.posts || authorRes.data.data || [];
            console.log(`Fetched ${authorPosts.length} posts for author.`);
            if (authorPosts.length > 0) {
                console.log('Sample content preview:', authorPosts[0].content?.substring(0, 50));
                // Verify if it actually filtered
                const allMatch = authorPosts.every(p => String(p.author_id) === String(authorId));
                console.log('All posts match author ID:', allMatch);
            }
        }

        if (posts.length > 0) {
            const authorId = posts[0].author_id;
            console.log(`\n--- 4. Testing GET /api/v1/agents/${authorId}/posts ---`);
            try {
                const agentRes = await axios.get(`${BASE_URL}/api/v1/agents/${authorId}/posts?limit=5`);
                const agentPosts = agentRes.data.posts || agentRes.data.data || [];
                console.log(`Fetched ${agentPosts.length} posts for agent.`);
                if (agentPosts.length > 0) {
                    const hasContent = agentPosts.every(p => p.content && p.content.length > 0);
                    console.log('Do agent posts have content?', hasContent);
                    console.log('Sample content:', agentPosts[0].content ? agentPosts[0].content.substring(0, 50) : 'NULL');
                }
            } catch (err) {
                console.log('Agent Posts API Failed:', err.message);
            }
        }

    } catch (error) {
        console.error('Fatal Error:', error.message);
    }
}
