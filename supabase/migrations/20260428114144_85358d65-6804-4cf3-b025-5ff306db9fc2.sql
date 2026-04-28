
-- Tornar catalogo de operadoras, rede credenciada e coparticipacao acessivel a qualquer pessoa (publico, sem login)
DROP POLICY IF EXISTS "Admins can manage operadoras catalogo" ON public.operadoras_catalogo;
DROP POLICY IF EXISTS "Admins can manage rede credenciada" ON public.rede_credenciada_catalogo;
DROP POLICY IF EXISTS "Admins can manage coparticipacao catalogo" ON public.coparticipacao_catalogo;

CREATE POLICY "Anyone can manage operadoras catalogo"
ON public.operadoras_catalogo FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage rede credenciada"
ON public.rede_credenciada_catalogo FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can manage coparticipacao catalogo"
ON public.coparticipacao_catalogo FOR ALL TO anon, authenticated
USING (true) WITH CHECK (true);
