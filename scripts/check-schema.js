const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
}

async function checkSchema() {
    console.log("🔍 Checking 'agents' table schema...");
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_API_KEY);

    // We can't directly query schema via JS client easily without specific permissions or helper function
    // But we can try to select * limit 1 and see the keys

    const { data, error } = await supabase
        .from('agents')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching agents:", error);
        return;
    }

    if (data && data.length > 0) {
        console.log("Found columns:", Object.keys(data[0]));
    } else {
        console.log("Table empty, cannot infer columns from data.");
        // Try to insert a dummy to see error? No that's risky.
        // We will assume standard columns if empty, but better to know.
    }
}

checkSchema();
