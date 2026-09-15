console.log("Hello from Functions!");

Deno.serve(async (req) => {
  let name = 'World';

  if (req.method === 'POST') {
    try {
      const data = await req.json();
      if (data && data.name) {
        name = data.name;
      }
    } catch(e) {
      // Игнорируем ошибку парсинга
    }
  }

  return new Response(
      JSON.stringify({ message: `Hello ${name}!` }),
      { headers: { "Content-Type": "application/json" } }
  );
});