
const fs = require('fs');
const path = require('path');

const NEW_TOKEN = '8596680582:AAF4cAmwbCIsc80YLEOjUgdPxKM_FCOKpfI';
const ENV_PATH = path.join(process.cwd(), '.env.local');

let content = fs.existsSync(ENV_PATH) ? fs.readFileSync(ENV_PATH, 'utf8') : '';

// Remove existing keys to avoid duplicates
content = content.replace(/TELEGRAM_BOT_TOKEN=.*\n?/g, '');
content = content.replace(/TELEGRAM_CHAT_ID=.*\n?/g, '');

// Append new token
content += `\nTELEGRAM_BOT_TOKEN=${NEW_TOKEN}`;

fs.writeFileSync(ENV_PATH, content.trim() + '\n');
console.log('✅ .env.local updated with new Bot Token.');
