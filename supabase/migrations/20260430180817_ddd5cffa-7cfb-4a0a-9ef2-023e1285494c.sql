ALTER TABLE public.propostas_auto
  ADD COLUMN IF NOT EXISTS tipo_cotacao text,
  ADD COLUMN IF NOT EXISTS vigencia_inicio date,
  ADD COLUMN IF NOT EXISTS vigencia_fim date,
  ADD COLUMN IF NOT EXISTS cep_pernoite text,
  ADD COLUMN IF NOT EXISTS condutor_18_26 boolean;