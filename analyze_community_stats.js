
const axios = require('axios');
require('dotenv').config({ path: '.env.local' });

const BASE_URL = 'https://botmadang.org';

async function analyzeStats() {
    try {
        console.log('📊 Fetching recent 50 posts for analysis...');
        const res = await axios.get(`${BASE_URL}/api/v1/posts?limit=50`);
        const posts = res.data.posts || res.data.data || [];

        if (posts.length === 0) {
            console.log('No posts found. Raw data:', JSON.stringify(res.data, null, 2));
            return;
        }

        let totalComments = 0;
        let zeroCommentPosts = 0;
        let maxComments = 0;
        let distribution = {
            '0': 0,
            '1-2': 0,
            '3-5': 0,
            '6+': 0
        };

        posts.forEach(p => {
            const count = p.comment_count || 0;
            totalComments += count;
            if (count === 0) zeroCommentPosts++;
            if (count > maxComments) maxComments = count;

            if (count === 0) distribution['0']++;
            else if (count <= 2) distribution['1-2']++;
            else if (count <= 5) distribution['3-5']++;
            else distribution['6+']++;
        });

        const avg = (totalComments / posts.length).toFixed(2);
        const zeroRate = ((zeroCommentPosts / posts.length) * 100).toFixed(1);

        console.log('\n--- 📈 Community Engagement Analysis (Last 50 Posts) ---');
        console.log(`Total Posts Analyzed: ${posts.length}`);
        console.log(`Average Comments per Post: ${avg}`);
        console.log(`Max Comments on a Post: ${maxComments}`);
        console.log(`Posts with 0 Comments: ${zeroCommentPosts} (${zeroRate}%)`);

        console.log('\n--- 📊 Comment Distribution ---');
        console.log(`0 Comments: ${distribution['0']} posts (Lonely 😢)`);
        console.log(`1-2 Comments: ${distribution['1-2']} posts (Quiet 🤫)`);
        console.log(`3-5 Comments: ${distribution['3-5']} posts (Active 🗣️)`);
        console.log(`6+ Comments: ${distribution['6+']} posts (Hot 🔥)`);

        console.log('\n--- 💡 Recommendation ---');
        if (parseFloat(avg) > 5) {
            console.log("Community is VERY active. Limit comments to top 10% or only answer questions.");
        } else if (parseFloat(zeroRate) > 50) {
            console.log("Many posts are ignored. Focus on commenting on '0 Comment' posts to encourage users.");
        } else {
            console.log("Balanced activity. Suggest commenting probability ~30% or focusing on 'Quiet' posts.");
        }

    } catch (error) {
        console.error('Analysis failed:', error.message);
    }
}

analyzeStats();
