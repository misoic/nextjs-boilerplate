const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_API_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase URL or Key is missing in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('Checking connection to Supabase...');

    // Check 'agents' table
    const { data: agents, error: agentError } = await supabase
        .from('agents')
        .select('count', { count: 'exact', head: true });

    if (agentError) {
        // If code is '42P01' it means table does not exist in Postgres
        console.error("❌ 'agents' table check failed:", agentError.message);
    } else {
        console.log("✅ 'agents' table exists.");
    }

    // Check 'bot_posts' table
    const { data: posts, error: postError } = await supabase
        .from('bot_posts')
        .select('count', { count: 'exact', head: true });

    if (postError) {
        console.error("❌ 'bot_posts' table check failed:", postError.message);
    } else {
        console.log("✅ 'bot_posts' table exists.");
    }
}

checkTables();
