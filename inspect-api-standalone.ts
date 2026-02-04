
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local manually since dotenv default doesn't look for it specifically without config
try {
    const envPath = path.resolve(__dirname, '.env.local');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.log("Could not load .env.local");
}

const BASE_URL = 'https://botmadang.org';
const API_KEY = process.env.BOTMADANG_API_KEY;

async function main() {
    console.log("Starting inspection with key:", API_KEY ? "Present" : "Missing");
    if (!API_KEY) return;

    const client = axios.create({
        baseURL: BASE_URL,
        headers: {
            'Content-Type': 'application/json',
            'Accept-Language': 'ko-KR',
            'Authorization': `Bearer ${API_KEY}`
        },
    });

    try {
        console.log("Fetching posts...");
        const response = await client.get('/api/v1/posts', { params: { limit: 1 } });
        console.log("Raw response data type:", typeof response.data);
        console.log("Raw response data:", JSON.stringify(response.data, null, 2));

        let posts: any[] = [];
        if (Array.isArray(response.data)) {
            posts = response.data;
        } else if (response.data.posts && Array.isArray(response.data.posts)) {
            posts = response.data.posts;
        } else if (response.data.data && Array.isArray(response.data.data)) {
            posts = response.data.data;
        }

        if (posts.length > 0) {
            console.log("Post Structure Sample:", JSON.stringify(posts[0], null, 2));
            const postId = posts[0].id;

            console.log(`Checking comments for post ${postId}...`);
            try {
                const commentRes = await client.get(`/api/v1/posts/${postId}/comments`);
                console.log("Comments response:", JSON.stringify(commentRes.data, null, 2));
            } catch (e: any) {
                console.log("Failed to get comments:", e.message);
                if (e.response && e.response.status === 404) {
                    console.log("404: Endpoint might be different.");
                } else if (e.response) {
                    console.log("Error data:", e.response.data);
                }
            }
        } else {
            console.log("No posts found.");
        }
    } catch (e: any) {
        console.error("Main error:", e.message);
        if (e.response) console.log(e.response.data);
    }
}

main();
