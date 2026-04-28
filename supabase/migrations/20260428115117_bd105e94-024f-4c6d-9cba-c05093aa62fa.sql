
ALTER TABLE public.propostas ALTER COLUMN user_id DROP NOT NULL;

DROP POLICY IF EXISTS "Users can view their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Users can create their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Users can update their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Users can delete their own propostas" ON public.propostas;
DROP POLICY IF EXISTS "Public can view propostas by slug" ON public.propostas;
DROP POLICY IF EXISTS "Anyone can view propostas" ON public.propostas;

CREATE POLICY "Public full access propostas"
ON public.propostas FOR ALL
TO anon, authenticated
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view operadoras of their propostas" ON public.proposta_operadoras;
DROP POLICY IF EXISTS "Users can insert operadoras of their propostas" ON public.proposta_operadoras;
DROP POLICY IF EXISTS "Users can update operadoras of their propostas" ON public.proposta_operadoras;
DROP POLICY IF EXISTS "Users can delete operadoras of their propostas" ON public.proposta_operadoras;
DROP POLICY IF EXISTS "Public can view operadoras by proposta slug" ON public.proposta_operadoras;
DROP POLICY IF EXISTS "Anyone can view operadoras" ON public.proposta_operadoras;

CREATE POLICY "Public full access proposta_operadoras"
ON public.proposta_operadoras FOR ALL
TO anon, authenticated
USING (true) WITH CHECK (true);
