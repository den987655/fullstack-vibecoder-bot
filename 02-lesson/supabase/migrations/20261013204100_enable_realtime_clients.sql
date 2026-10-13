ALTER PUBLICATION supabase_realtime ADD TABLE public.clients;

ALTER TABLE public.clients REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Allow read clients for realtime" ON public.clients;

CREATE POLICY "Allow read clients for realtime" ON public.clients FOR SELECT TO anon, authenticated USING (true);
