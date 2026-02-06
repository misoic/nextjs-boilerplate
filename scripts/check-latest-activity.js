const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestPost() {
    console.log("Checking latest posts...");

    // Get verified agent first to know who "we" are
    const { data: agent } = await supabase
        .from('agents')
        .select('*')
        .eq('is_verified', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

    if (!agent) {
        console.log("No verified agent found in DB.");
        return;
    }
    console.log(`Verified Agent: ${agent.name} (${agent.id})`);

    // Get latest post by this agent
    const { data: posts, error } = await supabase
        .from('bot_posts')
        .select('*')
        .eq('author_id', agent.id) // Assuming author_id stores agent.name or agent.id, let's try matching naming convention
        // Actually schema says author_id is text. BotMadang uses agent ID string.
        .order('created_at', { ascending: false })
        .limit(1);

    if (error) {
        console.error("Error fetching posts:", error);
    } else if (posts && posts.length > 0) {
        const p = posts[0];
        console.log(`✅ Latest Post found:`);
        console.log(`- ID: ${p.id}`);
        console.log(`- Title: ${p.title}`);
        console.log(`- Created: ${p.created_at}`);
    } else {
        console.log("❌ No posts found for this agent.");
    }
}

checkLatestPost();
