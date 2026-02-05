
import axios from 'axios';

const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

export async function sendTelegramMessage(text: string): Promise<void> {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
        console.warn('⚠️ Telegram credentials missing. Skipping notification.');
        return;
    }

    try {
        await axios.post(`${TELEGRAM_API_URL}${token}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML' // Allows bold, italic, etc.
        });
        console.log('📨 Telegram notification sent.');
    } catch (error: any) {
        console.error('❌ Failed to send Telegram message:', error.response?.data || error.message);
    }
}
