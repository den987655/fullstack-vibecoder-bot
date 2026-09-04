require('dotenv').config();
const fastify = require('fastify')({ logger: false });

const PORT = 3000;
// Поддерживаем оба варианта названия переменной, как мы сделали в set-webhook.js
const TELEGRAM_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

// Вспомогательная функция для отправки сообщения в Telegram
async function sendMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'HTML' // Позволяет использовать HTML-теги для красоты
            })
        });
    } catch (err) {
        console.error('Ошибка отправки сообщения:', err);
    }
}

// Эндпоинт для вебхука Telegram
fastify.post('/webhook/telegram', async (request, reply) => {
    const update = request.body;
    
    // Если пришло текстовое сообщение от юзера
    if (update && update.message && update.message.text) {
        const text = update.message.text.trim().toUpperCase();
        const chatId = update.message.chat.id;

        console.log(`Получено сообщение: ${text} от ${chatId}`);

        // Простой парсинг: ищем код валюты (3 латинские буквы) и число (сумму)
        const currencyMatch = text.match(/[A-Z]{3}/);
        const amountMatch = text.match(/[\d]+([.,][\d]+)?/);

        // Если бот не нашел 3 буквы валюты в сообщении
        if (!currencyMatch) {
            await sendMessage(chatId, "Привет! Напиши мне сумму и код валюты.\n\nНапример: <b>100 EUR</b> или просто <b>GBP</b>.");
        } else {
            const targetCurrency = currencyMatch[0]; // Например, 'EUR'
            // Если число есть, берем его, иначе по умолчанию считаем 1
            let amount = 1;
            if (amountMatch) {
                amount = parseFloat(amountMatch[0].replace(',', '.'));
            }

            try {
                // Идем в API за свежими курсами к доллару (база USD)
                const response = await fetch('https://api.frankfurter.dev/v1/latest?base=USD');
                const data = await response.json();
                const rates = data.rates;

                if (targetCurrency === 'USD') {
                    await sendMessage(chatId, `Это и есть американский доллар! 💵\n<b>${amount} USD</b> = <b>${amount} USD</b>.`);
                } else if (rates[targetCurrency]) {
                    const rate = rates[targetCurrency]; // Сколько targetCurrency в 1 USD
                    
                    // Считаем обе стороны для удобства
                    const toUsd = (amount / rate).toFixed(2);
                    const fromUsd = (amount * rate).toFixed(2);

                    const replyMessage = `💱 <b>Конвертация: ${targetCurrency} ↔ USD</b>
                    
💵 <b>${amount} ${targetCurrency}</b> = <b>${toUsd} USD</b>
💵 <b>${amount} USD</b> = <b>${fromUsd} ${targetCurrency}</b>

<i>Справочно: 1 USD = ${rate} ${targetCurrency}</i>`;
                    
                    await sendMessage(chatId, replyMessage);
                } else {
                    await sendMessage(chatId, `К сожалению, валюта <b>${targetCurrency}</b> не найдена в базе ЕЦБ.\n\nПопробуйте популярные: EUR, GBP, JPY, AUD, CAD...`);
                }
            } catch (err) {
                console.error('Ошибка обращения к API:', err);
                await sendMessage(chatId, "Упс, не смог получить свежие курсы валют. Попробуйте позже!");
            }
        }
    }

    // Обязательно возвращаем Telegram статус 'ok', чтобы он понял, что мы обработали запрос
    return { ok: true };
});

const start = async () => {
    try {
        if (!TELEGRAM_TOKEN) {
            console.warn('ВНИМАНИЕ: Не удалось найти токен для Telegram!');
        }

        await fastify.listen({ port: PORT });
        console.log(`Fastify сервер запущен на http://localhost:${PORT}`);
        console.log(`Webhook endpoint: POST http://localhost:${PORT}/webhook/telegram`);
    } catch (err) {
        console.error('Ошибка при запуске:', err);
        process.exit(1);
    }
};

start();