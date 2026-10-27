import { corsHeaders, requireAuth } from "../_shared/auth.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Проверка авторизации: доступ к списку клиентов только для авторизованных пользователей
    const { supabaseClient: supabase } = await requireAuth(req);

    // Возвращаем всех клиентов, сортируя от самого недавнего (по last_message_at)
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("last_message_at", { ascending: false });

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
