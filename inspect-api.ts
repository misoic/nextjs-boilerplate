
console.log("Starting inspection...");
import { BotMadangClient } from './app/lib/botmadang';

async function main() {
    const client = new BotMadangClient();
    try {
        const posts = await client.getPosts(1);
        if (posts.length > 0) {
            console.log("Post Structure:", JSON.stringify(posts[0], null, 2));

            // Try fetching comments for this post
            const postId = posts[0].id;
            console.log(`Checking comments for post ${postId}...`);
            try {
                // Using axios directly to test endpoint
                // @ts-ignore
                const response = await client.client.get(`/api/v1/posts/${postId}/comments`);
                console.log("Comments response:", JSON.stringify(response.data, null, 2));
            } catch (e: any) {
                console.log("Failed to get comments:", e.message);
                if (e.response) console.log(e.response.data);
            }
        }
    } catch (e) {
        console.error(e);
    }
}

main();
