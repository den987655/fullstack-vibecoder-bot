import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export class SupabaseRepository {
  async saveClientAndMessage(chatId: string | number, firstName: string, lastName: string, author: string, body: string, messengerType: string) {
    // 1. Проверяем, существует ли клиент
    const strChatId = String(chatId);
    let { data: clients, error: selectError } = await supabase
      .from("clients")
      .select("id")
      .eq("user_telegram_id", strChatId);

    if (selectError) {
      console.error("Ошибка при поиске клиента:", selectError);
      return;
    }

    let clientId;

    const now = new Date().toISOString();

    if (!clients || clients.length === 0) {
      // Создаем нового клиента
      const { data: newClient, error: insertError } = await supabase
        .from("clients")
        .insert([{
          user_telegram_id: strChatId,
          first_name: firstName,
          last_name: lastName || "",
          last_message_at: now
        }])
        .select()
        .single();
        
      if (insertError) {
        console.error("Ошибка при создании клиента:", insertError);
        return;
      }
      clientId = newClient.id;
    } else {
      // Обновляем существующего клиента
      clientId = clients[0].id;
      const { error: updateError } = await supabase
        .from("clients")
        .update({ last_message_at: now, first_name: firstName, last_name: lastName || "" })
        .eq("id", clientId);
        
      if (updateError) {
        console.error("Ошибка при обновлении клиента:", updateError);
      }
    }

    // 2. Добавляем сообщение
    const { error: messageError } = await supabase
      .from("messages")
      .insert([{
        client_id: clientId,
        author: author,
        body: body,
        messanger_user_id: strChatId,
        messenger_type: messengerType,
        created_at: now
      }]);

    if (messageError) {
      console.error("Ошибка при сохранении сообщения:", messageError);
    }
  }
}

export const supabaseRepository = new SupabaseRepository();
