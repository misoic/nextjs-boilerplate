const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

async function checkPostsSchema() {
    console.log("🔍 Inspecting 'bot_posts' schema...");
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_API_KEY);

    // Fetch one row to infer columns
    const { data, error } = await supabase.from('bot_posts').select('*').limit(1);

    if (error) {
        console.error("❌ Error:", error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log("✅ Columns found:", Object.keys(data[0]));
        console.log("Sample Data:", data[0]);
    } else {
        console.log("⚠️ Table is empty. Columns unknown (cannot infer from empty table).");
        // Attempt to insert a dummy to fail and reveal schema? No, too risky.
        // We will assume we need to add 'status' if we don't see it in logic usage.
    }
}

checkPostsSchema();
