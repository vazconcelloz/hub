-- ============================================================
-- 1. Restrição de domínio @grupofbn.com.br no cadastro
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_grupofbn_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NULL OR NEW.email NOT ILIKE '%@grupofbn.com.br' THEN
    RAISE EXCEPTION 'Apenas e-mails @grupofbn.com.br podem se cadastrar neste hub.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_grupofbn_email_trigger ON auth.users;
CREATE TRIGGER validate_grupofbn_email_trigger
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.validate_grupofbn_email();

-- ============================================================
-- 2. Tabela: treinamentos
-- ============================================================
CREATE TABLE public.treinamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  conteudo TEXT,
  ordem INTEGER NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.treinamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver treinamentos"
ON public.treinamentos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados podem criar treinamentos"
ON public.treinamentos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Autenticados podem atualizar treinamentos"
ON public.treinamentos FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Autenticados podem deletar treinamentos"
ON public.treinamentos FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_treinamentos_updated_at
BEFORE UPDATE ON public.treinamentos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. Tabela: manuais
-- ============================================================
CREATE TABLE public.manuais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  titulo TEXT NOT NULL,
  descricao TEXT,
  categoria TEXT,
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT,
  tamanho_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.manuais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver manuais"
ON public.manuais FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados podem criar manuais"
ON public.manuais FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Autenticados podem atualizar manuais"
ON public.manuais FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Autenticados podem deletar manuais"
ON public.manuais FOR DELETE TO authenticated USING (true);

CREATE TRIGGER update_manuais_updated_at
BEFORE UPDATE ON public.manuais
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. Tabela: segmentacoes
-- ============================================================
CREATE TABLE public.segmentacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  criterios JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_contatos INTEGER NOT NULL DEFAULT 0,
  criado_por UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.segmentacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Autenticados podem ver segmentacoes"
ON public.segmentacoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Autenticados podem criar segmentacoes"
ON public.segmentacoes FOR INSERT TO authenticated WITH CHECK (auth.uid() = criado_por OR criado_por IS NULL);

CREATE POLICY "Donos ou admins podem atualizar segmentacoes"
ON public.segmentacoes FOR UPDATE TO authenticated USING (auth.uid() = criado_por OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Donos ou admins podem deletar segmentacoes"
ON public.segmentacoes FOR DELETE TO authenticated USING (auth.uid() = criado_por OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_segmentacoes_updated_at
BEFORE UPDATE ON public.segmentacoes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. Bucket de armazenamento: manuais (privado)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('manuais', 'manuais', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Autenticados podem ler manuais"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'manuais');

CREATE POLICY "Autenticados podem enviar manuais"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'manuais');

CREATE POLICY "Autenticados podem atualizar manuais"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'manuais');

CREATE POLICY "Autenticados podem deletar manuais"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'manuais');
