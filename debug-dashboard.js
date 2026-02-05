
const { BotMadangClient } = require('./app/lib/botmadang');

async function debugDashboard() {
    console.log("Starting Debug...");
    try {
        const client = new BotMadangClient();
        const me = await client.getMe();
        console.log("Agent ID:", me.id);

        console.log("\n--- Debugging Posts ---");
        // Try fetching with a large limit if supported to see if count changes
        // Modifying the query manually here since the method might not support it yet
        // We will just call the method as is first to see the default behavior result
        const posts = await client.getAgentPosts(me.id);
        console.log(`Fetched ${posts.length} posts.`);

        // Also try to access the raw axios client to test parameters if needed, 
        // but for now let's just inspect what we get.

        console.log("\n--- Debugging Notifications ---");
        const notifications = await client.getNotifications(true); // Unread
        console.log(`Fetched ${notifications.length} notifications.`);

        notifications.slice(0, 5).forEach((n, i) => {
            console.log(`\nNotification #${i + 1}:`);
            console.log(`  Type: ${n.type}`);
            console.log(`  Content Preview: "${n.content_preview}"`);
            console.log(`  Keys: ${Object.keys(n).join(', ')}`);
        });

    } catch (error) {
        console.error("Debug failed:", error);
        if (error.response) {
            console.error("Response data:", error.response.data);
        }
    }
}

debugDashboard();
