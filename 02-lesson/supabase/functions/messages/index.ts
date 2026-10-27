import { corsHeaders, requireAuth } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Проверка авторизации: доступ к сообщениям только для авторизованных пользователей
    const { supabaseClient: supabase } = await requireAuth(req);

    // Получаем параметр clientId из строки запроса
    const url = new URL(req.url);
    const clientId = url.searchParams.get("clientId");

    let query = supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false });

    // Если передан конкретный клиент, фильтруем сообщения по нему
    if (clientId) {
      query = query.eq("client_id", clientId);
    }

    const { data, error } = await query;

    if (error) throw error;

    return new Response(JSON.stringify(data ?? []), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    if (error instanceof Response) {
      return error;
    }
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
