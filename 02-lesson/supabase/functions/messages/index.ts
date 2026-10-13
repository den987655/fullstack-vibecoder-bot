import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
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
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
