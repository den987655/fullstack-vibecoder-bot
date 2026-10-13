ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

ALTER TABLE public.messages REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Allow read messages for realtime" ON public.messages;

CREATE POLICY "Allow read messages for realtime" ON public.messages FOR SELECT TO anon, authenticated USING (true);
