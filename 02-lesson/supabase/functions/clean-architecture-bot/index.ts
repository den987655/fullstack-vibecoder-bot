import { webhookController } from "./src/presentation/controllers/WebhookController.ts";

Deno.serve(async (req: Request) => {
  // Получаем путь запроса и метод
  const url = new URL(req.url);
  const path = url.pathname;
  const method = req.method;

  // 1. Роут для домашнего задания (GET запрос на корень функции или /)
  if (method === "GET") {
    return webhookController.getHometaskData();
  }

  // 2. Роут для вебхука Telegram (POST запрос)
  if (method === "POST" && path.includes("/webhook/telegram")) {
    return webhookController.handleTelegramWebhook(req);
  }

  // Роут не найден - возвращаем 404
  return new Response("Not Found", { status: 404 });
});