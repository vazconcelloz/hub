-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create propostas table
CREATE TABLE public.propostas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_cliente TEXT NOT NULL,
  telefone_cliente TEXT,
  cidade TEXT,
  estado TEXT,
  tipo_produto TEXT,
  faixa_etaria_ou_perfil TEXT,
  consultora_nome TEXT,
  consultora_telefone TEXT,
  consultora_foto_url TEXT,
  validade_proposta DATE,
  observacoes_gerais TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviada', 'visualizada', 'em_atendimento', 'fechada', 'perdida')),
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proposta_operadoras table
CREATE TABLE public.proposta_operadoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id UUID NOT NULL REFERENCES public.propostas(id) ON DELETE CASCADE,
  operadora_nome TEXT NOT NULL,
  plano_nome TEXT,
  valor_mensal NUMERIC(10,2),
  coparticipacao TEXT,
  acomodacao TEXT,
  abrangencia TEXT,
  reembolso TEXT,
  resumo_cobertura TEXT,
  rede_credenciada_resumo TEXT,
  destaque_comercial TEXT CHECK (destaque_comercial IN ('economico', 'completo', 'recomendado', 'custo_beneficio', NULL)),
  ordem_exibicao INTEGER NOT NULL DEFAULT 0,
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposta_operadoras ENABLE ROW LEVEL SECURITY;

-- Propostas policies
CREATE POLICY "Users can view their own propostas"
  ON public.propostas FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create propostas"
  ON public.propostas FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own propostas"
  ON public.propostas FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own propostas"
  ON public.propostas FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Public access to propostas by slug
CREATE POLICY "Anyone can view propostas by slug"
  ON public.propostas FOR SELECT TO anon
  USING (true);

-- Operadoras policies
CREATE POLICY "Users can view operadoras of their propostas"
  ON public.proposta_operadoras FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.propostas WHERE id = proposta_id AND user_id = auth.uid()));

CREATE POLICY "Users can create operadoras"
  ON public.proposta_operadoras FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.propostas WHERE id = proposta_id AND user_id = auth.uid()));

CREATE POLICY "Users can update operadoras"
  ON public.proposta_operadoras FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.propostas WHERE id = proposta_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete operadoras"
  ON public.proposta_operadoras FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.propostas WHERE id = proposta_id AND user_id = auth.uid()));

-- Public access to operadoras
CREATE POLICY "Anyone can view operadoras publicly"
  ON public.proposta_operadoras FOR SELECT TO anon
  USING (true);

-- Triggers
CREATE TRIGGER update_propostas_updated_at
  BEFORE UPDATE ON public.propostas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_proposta_operadoras_updated_at
  BEFORE UPDATE ON public.proposta_operadoras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_propostas_slug ON public.propostas(slug);
CREATE INDEX idx_propostas_user_id ON public.propostas(user_id);
CREATE INDEX idx_propostas_status ON public.propostas(status);
CREATE INDEX idx_proposta_operadoras_proposta_id ON public.proposta_operadoras(proposta_id);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('operadora-pdfs', 'operadora-pdfs', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('consultora-fotos', 'consultora-fotos', true);

-- Storage policies for PDFs
CREATE POLICY "PDFs are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'operadora-pdfs');
CREATE POLICY "Authenticated users can upload PDFs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'operadora-pdfs');
CREATE POLICY "Authenticated users can update PDFs"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'operadora-pdfs');
CREATE POLICY "Authenticated users can delete PDFs"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'operadora-pdfs');

-- Storage policies for consultant photos
CREATE POLICY "Consultant photos are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'consultora-fotos');
CREATE POLICY "Authenticated users can upload consultant photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'consultora-fotos');
CREATE POLICY "Authenticated users can update consultant photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'consultora-fotos');
CREATE POLICY "Authenticated users can delete consultant photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'consultora-fotos');