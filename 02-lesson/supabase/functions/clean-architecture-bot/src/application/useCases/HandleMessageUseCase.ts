import { exchangeRateProvider } from "../../infrastructure/providers/FrankfurterApi.ts";
import { messageSender } from "../../infrastructure/bot/TelegramSender.ts";
import { supabaseRepository } from "../../infrastructure/database/SupabaseRepository.ts";

export class HandleMessageUseCase {
  async execute(chatId: string | number, text: string, firstName: string = "", lastName: string = "") {
    // Сохраняем сообщение от пользователя в БД
    await supabaseRepository.saveClientAndMessage(chatId, firstName, lastName, "user", text, "telegram");

    if (!text) {
      const resp = \"Отправьте текстовое сообщение.\";
      await messageSender.sendMessage(chatId, resp);
      await supabaseRepository.saveClientAndMessage(chatId, firstName, lastName, "bot", resp, "telegram");
      return;
    }

    const amountMatch = text.match(/\d+(?:[.,]\d+)?/);
    const amountStr = amountMatch ? amountMatch[0].replace(",", ".") : "1";
    const amount = parseFloat(amountStr);

    const currencyMatch = text.match(/[A-Za-z]{3}/);

    if (!currencyMatch) {
      const resp = "Привет! Напиши мне сумму и код валюты.\n\nНапример: <b>100 EUR</b> или просто <b>GBP</b>.";
      await messageSender.sendMessage(chatId, resp);
      await supabaseRepository.saveClientAndMessage(chatId, firstName, lastName, "bot", resp, "telegram");
      return;
    }

    const currencyCode = currencyMatch[0].toUpperCase();

    try {
      if (currencyCode === "USD") {
        const resp = `Это и есть американский доллар! 💵\n<b>${amount} USD</b> = <b>${amount} USD</b>.`;
        await messageSender.sendMessage(chatId, resp);
        await supabaseRepository.saveClientAndMessage(chatId, firstName, lastName, "bot", resp, "telegram");
        return;
      }

      const data = await exchangeRateProvider.getLatestRates(currencyCode);
      const rateVsBase = data.rates[currencyCode];
      
      if (!rateVsBase) {
        const resp = `К сожалению, валюта <b>${currencyCode}</b> не найдена в базе ЕЦБ.\n\nПопробуйте популярные: EUR, GBP, JPY, AUD, CAD...`;
        await messageSender.sendMessage(chatId, resp);
        await supabaseRepository.saveClientAndMessage(chatId, firstName, lastName, "bot", resp, "telegram");
        return;
      }

      const toUsd = (amount / rateVsBase).toFixed(2);
      const fromUsd = (amount * rateVsBase).toFixed(2);

      const resp = `💱 <b>Конвертация: ${currencyCode} ↔ USD</b>\n                    \n💵 <b>${amount} ${currencyCode}</b> = <b>${toUsd} USD</b>\n💵 <b>${amount} USD</b> = <b>${fromUsd} ${currencyCode}</b>\n\n<i>Справочно: 1 USD = ${rateVsBase} ${currencyCode}</i>`;

      const replyMarkup = {
        inline_keyboard: [[
          { text: "🔄 Обратный курс", callback_data: `rev|${currencyCode}|${amount}|${rateVsBase}` }
        ]]
      };

      await messageSender.sendMessage(chatId, resp, { reply_markup: replyMarkup });
      await supabaseRepository.saveClientAndMessage(chatId, firstName, lastName, "bot", resp, "telegram");

    } catch (error: any) {
      console.error("Ошибка в Use Case (execute):", error.message);
      const resp = "Упс, не смог получить свежие курсы валют. Попробуйте позже!";
      await messageSender.sendMessage(chatId, resp);
      await supabaseRepository.saveClientAndMessage(chatId, firstName, lastName, "bot", resp, "telegram");
    }
  }

  async handleCallback(query: any) {
    const data = query.data;
    const chatId = query.message.chat.id;
    const messageId = query.message.message_id;
    const firstName = query.from?.first_name || "";
    const lastName = query.from?.last_name || "";

    if (!data) return;

    // Считаем нажатие на инлайн кнопку сообщением от пользователя
    await supabaseRepository.saveClientAndMessage(chatId, firstName, lastName, "user", `[кнопка] ${data}`, "telegram");

    try {
      if (data.startsWith("rev|") || data.startsWith("fwd|")) {
        const parts = data.split("|");
        const mode = parts[0];
        const currencyCode = parts[1];
        const amount = parseFloat(parts[2]);
        const rateVsBase = parseFloat(parts[3]);

        if (rateVsBase === 0) throw new Error("Деление на ноль недопустимо");

        const toUsd = (amount / rateVsBase).toFixed(2);
        const fromUsd = (amount * rateVsBase).toFixed(2);

        let messageText = "";
        let replyMarkup = {};

        if (mode === "rev") {
          const reverseRate = 1 / rateVsBase;
          messageText = `💱 <b>Обратный курс: USD ↔ ${currencyCode}</b>\n                    \n💵 <b>${toUsd} USD</b> = <b>${amount} ${currencyCode}</b>\n💵 <b>${fromUsd} ${currencyCode}</b> = <b>${amount} USD</b>\n\n<i>Справочно: 1 ${currencyCode} = ${reverseRate.toFixed(5)} USD</i>`;

          replyMarkup = {
            inline_keyboard: [[
              { text: "🔙 Прямой курс", callback_data: `fwd|${currencyCode}|${amount}|${rateVsBase}` }
            ]]
          };
        } else {
          messageText = `💱 <b>Конвертация: ${currencyCode} ↔ USD</b>\n                    \n💵 <b>${amount} ${currencyCode}</b> = <b>${toUsd} USD</b>\n💵 <b>${amount} USD</b> = <b>${fromUsd} ${currencyCode}</b>\n\n<i>Справочно: 1 USD = ${rateVsBase} ${currencyCode}</i>`;

          replyMarkup = {
            inline_keyboard: [[
              { text: "🔄 Обратный курс", callback_data: `rev|${currencyCode}|${amount}|${rateVsBase}` }
            ]]
          };
        }

        await messageSender.editMessageText(chatId, messageId, messageText, { reply_markup: replyMarkup });
        await messageSender.answerCallbackQuery(query.id);
        
        await supabaseRepository.saveClientAndMessage(chatId, firstName, lastName, "bot", messageText, "telegram");
      } else {
        await messageSender.answerCallbackQuery(query.id, "Неизвестная кнопка", true);
      }
    } catch (error: any) {
      console.error("Ошибка в Use Case (handleCallback):", error.message);
      await messageSender.answerCallbackQuery(query.id, "Ошибка при пересчете курса", true);
    }
  }
}

export const handleMessageUseCase = new HandleMessageUseCase();
