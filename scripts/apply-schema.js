const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config(); // fallback
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    console.error('DATABASE_URL is not set in environment variables.');
    process.exit(1);
}

const client = new Client({
    connectionString: connectionString,
    ssl: {
        rejectUnauthorized: false
    }
});

async function applySchema() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const schemaPath = path.resolve(process.cwd(), 'db/schema.sql');
        const sql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema...');
        await client.query(sql);
        console.log('Schema applied successfully!');

    } catch (err) {
        console.error('Error applying schema:', err);
    } finally {
        await client.end();
    }
}

applySchema();
