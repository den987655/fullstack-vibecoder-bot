ALTER PUBLICATION supabase_realtime ADD TABLE public.articles;

ALTER TABLE public.articles REPLICA IDENTITY FULL;

DROP POLICY IF EXISTS "Allow read articles for realtime" ON public.articles;

CREATE POLICY "Allow read articles for realtime" ON public.articles FOR SELECT TO anon, authenticated USING (true);
