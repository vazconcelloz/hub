-- =========================================
-- COTAÇÕES DE AUTOMÓVEL
-- Estrutura espelhada (mas independente) do esquema de saúde
-- =========================================

-- Propostas de auto
CREATE TABLE public.propostas_auto (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pendente',

  -- Cliente / veículo (essencial)
  nome_cliente TEXT NOT NULL,
  telefone_cliente TEXT,
  veiculo_marca_modelo TEXT,

  -- Consultora / validade (mesmo padrão do saúde)
  consultora_nome TEXT,
  consultora_telefone TEXT,
  consultora_foto_url TEXT,
  validade_proposta DATE,

  observacoes_gerais TEXT,
  linhas_ocultas TEXT[] DEFAULT '{}'::text[],
  cores_rotulos JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cotações (cards) por seguradora dentro de uma proposta de auto
CREATE TABLE public.proposta_auto_seguradoras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id UUID NOT NULL REFERENCES public.propostas_auto(id) ON DELETE CASCADE,

  seguradora_nome TEXT NOT NULL,
  produto_nome TEXT,
  premio_total NUMERIC,                 -- "Valor do seguro"
  cobertura_resumo TEXT,                -- ex.: Colisão, Incêndio, Roubo e Furto

  -- Franquia
  franquia_valor NUMERIC,
  franquia_tipo TEXT,                   -- ex.: Reduzida (50%), Normal, etc.

  -- Indenização
  percentual_fipe TEXT,                 -- "100%", "0%", "Valor determinado: R$ X"

  -- Danos a terceiros
  danos_materiais NUMERIC,
  danos_corporais NUMERIC,
  danos_morais NUMERIC,

  -- App / coberturas extras
  app_morte_invalidez NUMERIC,
  assistencia_24h TEXT,                 -- ex.: "500 km de reboque"
  vidros TEXT,                          -- "Sim", "Não contemplado", detalhe
  carro_reserva TEXT,

  -- Pagamento
  parcelamento TEXT,                    -- ex.: "10x de R$ 415,39"
  formas_pagamento TEXT,

  destaque_comercial TEXT,
  ordem_exibicao INTEGER NOT NULL DEFAULT 0,
  cor_coluna TEXT,
  cores_celulas JSONB,

  pdf_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_proposta_auto_seg_proposta ON public.proposta_auto_seguradoras(proposta_id);

-- =========================================
-- RLS — mesmo padrão de propostas de saúde
-- (autenticado gerencia as suas; público vê via slug)
-- =========================================
ALTER TABLE public.propostas_auto ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposta_auto_seguradoras ENABLE ROW LEVEL SECURITY;

-- propostas_auto
CREATE POLICY "Users can create propostas_auto"
  ON public.propostas_auto FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can view propostas_auto by slug"
  ON public.propostas_auto FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated full access propostas_auto"
  ON public.propostas_auto FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- proposta_auto_seguradoras
CREATE POLICY "Users can create auto seguradoras"
  ON public.proposta_auto_seguradoras FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.propostas_auto p
    WHERE p.id = proposta_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can update auto seguradoras"
  ON public.proposta_auto_seguradoras FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.propostas_auto p
    WHERE p.id = proposta_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete auto seguradoras"
  ON public.proposta_auto_seguradoras FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.propostas_auto p
    WHERE p.id = proposta_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Anyone can view auto seguradoras publicly"
  ON public.proposta_auto_seguradoras FOR SELECT TO anon
  USING (true);

CREATE POLICY "Authenticated full access auto seguradoras"
  ON public.proposta_auto_seguradoras FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Triggers de updated_at
CREATE TRIGGER trg_propostas_auto_updated
  BEFORE UPDATE ON public.propostas_auto
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_proposta_auto_seg_updated
  BEFORE UPDATE ON public.proposta_auto_seguradoras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();