require('dotenv').config();

// Читаем переменные окружения
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN; // или process.env.BOT_TOKEN, взависимости от того как у вас названо
const baseUrl = process.env.WEBHOOK_URL; // Например: https://ваш-домен.ngrok.app

if (!BOT_TOKEN || !baseUrl) {
    console.error('Ошибка: BOT_TOKEN или WEBHOOK_URL не найдены в .env файле');
    process.exit(1);
}

async function setWebhook() {
    // This must match the route defined in server.js
    const webhookUrl = `${baseUrl.replace(/\/$/, "")}/webhook/telegram`;

    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: webhookUrl }),
        });

        const result = await response.json();

        if (result.ok) {
            console.log(`Webhook registered: ${webhookUrl}`);
        } else {
            console.error("Telegram rejected the webhook:", result);
            process.exit(1);
        }
    } catch (error) {
        console.error("Ошибка при выполнении запроса:", error);
        process.exit(1);
    }
}

setWebhook();
