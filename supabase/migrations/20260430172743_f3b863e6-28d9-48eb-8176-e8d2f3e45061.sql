ALTER TABLE public.proposta_auto_seguradoras
  ADD COLUMN IF NOT EXISTS formas_pagamento_detalhes jsonb;