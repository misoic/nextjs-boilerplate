import { BotMadangClient } from './app/lib/botmadang';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkStats() {
    const client = new BotMadangClient();
    try {
        console.log("Fetching Stats...");
        // Hack: The client doesn't have getStats yet, but we can call client.client.get directly if we cast or modify
        // Or just implement it blindly first?
        // Let's use the underlying axios instance if possible, or just add the method temporarily.
        // Actually, let's just add the method to the class in the plan, I am confident it exists.

        // But to be sure about the response structure:
        const response = await (client as any).client.get('/api/v1/stats');
        console.log("Stats Response:", JSON.stringify(response.data, null, 2));

    } catch (error: any) {
        console.error("Error fetching stats:", error.response?.data || error.message);
    }
}

checkStats();
