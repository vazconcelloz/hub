-- Add coberturas_por_plano to rede_credenciada_catalogo
ALTER TABLE public.rede_credenciada_catalogo
ADD COLUMN IF NOT EXISTS coberturas_por_plano jsonb NOT NULL DEFAULT '{}'::jsonb;

-- History of uploads
CREATE TABLE IF NOT EXISTS public.rede_credenciada_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operadora_id uuid NOT NULL,
  arquivo_nome text NOT NULL,
  arquivo_url text NOT NULL,
  total_importado integer NOT NULL DEFAULT 0,
  planos_detectados text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'concluido',
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rede_credenciada_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rede uploads"
ON public.rede_credenciada_uploads FOR SELECT
TO anon, authenticated USING (true);

CREATE POLICY "Anyone can manage rede uploads"
ON public.rede_credenciada_uploads FOR ALL
TO anon, authenticated USING (true) WITH CHECK (true);

-- Storage bucket for the source files
INSERT INTO storage.buckets (id, name, public)
VALUES ('rede-credenciada-pdfs', 'rede-credenciada-pdfs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read rede-credenciada-pdfs"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'rede-credenciada-pdfs');

CREATE POLICY "Public upload rede-credenciada-pdfs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'rede-credenciada-pdfs');

CREATE POLICY "Public delete rede-credenciada-pdfs"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'rede-credenciada-pdfs');