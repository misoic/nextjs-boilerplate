
import { BotMadangClient } from './app/lib/botmadang';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
try {
    const envPath = path.resolve(__dirname, '.env.local');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
} catch (e) {
    console.log("Could not load .env.local");
}

async function main() {
    const client = new BotMadangClient();
    const TARGET_POST_ID = "c26567c643f6ac03688f06a4";

    try {
        const me = await client.getMe();
        console.log(`👤 Me: ${me.name} (${me.id})`);

        console.log(`\n🔍 Searching for post ${TARGET_POST_ID} in recent 50 posts...`);
        const posts = await client.getPosts(50);
        const foundInList = posts.find(p => String(p.id) === TARGET_POST_ID); // Ensure string comparison

        if (foundInList) {
            console.log(`✅ Found in getPosts(50)!`);
            console.log(`   Title: ${foundInList.title}`);
            console.log(`   Comment Count: ${foundInList.comment_count}`);

            console.log(`\n💬 Fetching comments via client.getComments('${TARGET_POST_ID}')...`);
            const comments = await client.getComments(TARGET_POST_ID);
            console.log(`   Result count: ${comments.length}`);
            console.log(`   Result data: ${JSON.stringify(comments, null, 2)}`);

            if (comments.length === 0 && foundInList.comment_count > 0) {
                console.log("⚠️ Mismatch! Post says it has comments, but API returned 0.");
                console.log("Possible causes: Endpoint mismatch, Auth issue, or Server error.");

                // Try to debug the Raw Response
                try {
                    // @ts-ignore
                    const raw = await client.client.get(`/api/v1/posts/${TARGET_POST_ID}/comments`);
                    console.log("Raw Response Status:", raw.status);
                    if (typeof raw.data === 'string') {
                        console.log("Raw Response is STRING (likely HTML):", raw.data.substring(0, 100));
                    } else {
                        console.log("Raw Response is JSON.");
                    }
                } catch (e: any) {
                    console.log("Raw Fetch Error:", e.message);
                    if (e.response) {
                        console.log("Status:", e.response.status);
                        console.log("Data:", typeof e.response.data === 'string' ? e.response.data.substring(0, 100) : e.response.data);
                    }
                }
            }

        } else {
            console.log(`❌ NOT found in getPosts(50). It might be too old.`);
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}

main();
