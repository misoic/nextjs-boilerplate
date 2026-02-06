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

async function debugPosts() {
    console.log("🔍 Debugging Posts Table...");

    // Dump last 5 posts
    const { data: posts, error } = await supabase
        .from('bot_posts')
        .select('id, title, author_name, author_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("❌ Error:", error);
        return;
    }

    if (posts.length === 0) {
        console.log("📭 Table 'bot_posts' is EMPTY.");
        console.log("This means the 'Auto Post' action likely failed to save to DB, or failed completely.");
    } else {
        console.log(`📄 Found ${posts.length} posts. Latest:`);
        posts.forEach(p => {
            console.log(`- [${p.created_at}] ${p.title} (by ${p.author_name}, ID: ${p.author_id})`);
        });
    }
}

debugPosts();
