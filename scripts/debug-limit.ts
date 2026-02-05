import { BotMadangClient } from '../app/lib/botmadang';

async function main() {
    console.log("🔍 Debugging API Limits...");
    const client = new BotMadangClient();
    const me = await client.getMe();
    console.log(`Agent: ${me.name} (${me.id})`);

    // Test 1: Limit 105
    console.log("\n--- Test 1: limit=105 ---");
    const posts105 = await client.getAgentPosts(me.id, 105);
    console.log(`Requested 105, Got: ${posts105.length}`);
    if (posts105.length > 0) {
        console.log(`Latest: ${posts105[0].created_at} - ${posts105[0].title}`);
        console.log(`Oldest: ${posts105[posts105.length - 1].created_at} - ${posts105[posts105.length - 1].title}`);
    }

    // Test 2: limit=1
    console.log("\n--- Test 2: limit=1 ---");
    const posts1 = await client.getAgentPosts(me.id, 1);
    console.log(`Requested 1, Got: ${posts1.length}`);

    // Test 3: Probing Pagination (page vs offset)
    // We'll define a custom method to pass arbitrary params
    // @ts-ignore
    const rawClient = client.client;

    console.log("\n--- Test 3: Probing 'page' param ---");
    try {
        const resPage2 = await rawClient.get(`/api/v1/agents/${me.id}/posts`, { params: { limit: 5, page: 2 } });
        const postsPage2 = resPage2.data.posts || resPage2.data.data || [];
        console.log(`Page 2 (limit 5): Got ${postsPage2.length}`);
        if (postsPage2.length > 0) console.log(`First of Page 2: ${postsPage2[0].title}`);
    } catch (e: any) { console.log("Page param failed:", e.message); }

    console.log("\n--- Test 4: Probing 'offset' param ---");
    try {
        const resOffset = await rawClient.get(`/api/v1/agents/${me.id}/posts`, { params: { limit: 5, offset: 5 } });
        const postsOffset = resOffset.data.posts || resOffset.data.data || [];
        console.log(`Offset 5 (limit 5): Got ${postsOffset.length}`);
        if (postsOffset.length > 0) console.log(`First of Offset 5: ${postsOffset[0].title}`);
    } catch (e: any) { console.log("Offset param failed:", e.message); }

    console.log("\n--- Test 5: Probing 'skip' param ---");
    try {
        const resSkip = await rawClient.get(`/api/v1/agents/${me.id}/posts`, { params: { limit: 5, skip: 5 } });
        const postsSkip = resSkip.data.posts || resSkip.data.data || [];
        console.log(`Skip 5 (limit 5): Got ${postsSkip.length}`);
        if (postsSkip.length > 0) console.log(`First of Skip 5: ${postsSkip[0].title}`);
    } catch (e: any) { console.log("Skip param failed:", e.message); }
}

main().catch(console.error);
