import { handleMessageUseCase } from "../../application/useCases/HandleMessageUseCase.ts";

export class WebhookController {

  async getHometaskData(): Promise<Response> {
    const responseData = {
      message: "hello, it-incubator",
      studentId: "4403"
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  async handleTelegramWebhook(req: Request): Promise<Response> {
    try {
      const update = await req.json();

      if (update.message && update.message.text) {
        const chatId = update.message.chat.id;
        const text = update.message.text;
        const firstName = update.message.from?.first_name || "";
        const lastName = update.message.from?.last_name || "";

        // Ждем завершения обработки сообщения перед возвратом 200 OK
        await handleMessageUseCase.execute(chatId, text, firstName, lastName);
      }
      else if (update.callback_query) {
        await handleMessageUseCase.handleCallback(update.callback_query);
      }

      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });

    } catch (error) {
      console.error("Ошибка при разборе вебхука:", error);
      return new Response("Bad Request", { status: 400 });
    }
  }
}

export const webhookController = new WebhookController();