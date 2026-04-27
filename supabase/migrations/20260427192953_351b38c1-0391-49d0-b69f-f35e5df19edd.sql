-- =========================================================
-- 1. ROLES (papéis de usuário) — admin vs user
-- =========================================================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função SECURITY DEFINER para checar papel sem recursão de RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 2. OPERADORAS_CATALOGO
-- =========================================================
CREATE TABLE public.operadoras_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  ativo boolean NOT NULL DEFAULT true,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.operadoras_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view operadoras catalogo"
  ON public.operadoras_catalogo FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage operadoras catalogo"
  ON public.operadoras_catalogo FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_operadoras_catalogo_updated_at
  BEFORE UPDATE ON public.operadoras_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. REDE_CREDENCIADA_CATALOGO
-- =========================================================
CREATE TABLE public.rede_credenciada_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operadora_id uuid NOT NULL REFERENCES public.operadoras_catalogo(id) ON DELETE CASCADE,

  -- Identificação
  nome text NOT NULL,                          -- "Hospital Albert Einstein"
  tipo text NOT NULL,                          -- 'hospital' | 'laboratorio' | 'clinica' | 'pronto_socorro' | 'maternidade'
  especialidades text[] DEFAULT '{}',          -- ['cardiologia', 'oncologia']

  -- Localização
  cep text,
  endereco text,
  bairro text,
  cidade text NOT NULL,
  estado text NOT NULL,                        -- UF: 'SP', 'RJ'...
  latitude numeric,                            -- para cálculo de proximidade
  longitude numeric,
  telefone text,

  -- Vínculo opcional a planos específicos
  -- Se vazio = vale para TODOS os planos da operadora
  -- Se preenchido = vale só para esses planos (ex: ['Top Nacional', 'Premium'])
  planos_aplicaveis text[] DEFAULT '{}',

  destaque boolean NOT NULL DEFAULT false,     -- "rede destaque" ranqueia primeiro
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rede_operadora ON public.rede_credenciada_catalogo(operadora_id);
CREATE INDEX idx_rede_cidade_estado ON public.rede_credenciada_catalogo(cidade, estado);
CREATE INDEX idx_rede_tipo ON public.rede_credenciada_catalogo(tipo);

ALTER TABLE public.rede_credenciada_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rede credenciada"
  ON public.rede_credenciada_catalogo FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage rede credenciada"
  ON public.rede_credenciada_catalogo FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_rede_credenciada_updated_at
  BEFORE UPDATE ON public.rede_credenciada_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. COPARTICIPACAO_CATALOGO
-- =========================================================
CREATE TABLE public.coparticipacao_catalogo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operadora_id uuid NOT NULL REFERENCES public.operadoras_catalogo(id) ON DELETE CASCADE,

  -- Escopo
  plano_nome text,                             -- nulo = vale para qualquer plano da operadora
  modalidade text NOT NULL DEFAULT 'padrao',   -- 'padrao' | 'sem_copart' | 'parcial' | 'integral'

  -- Itens detalhados: [{ item: 'Consulta', valor: '30%' }, { item: 'Exames simples', valor: 'R$ 25,00' }, ...]
  itens jsonb NOT NULL DEFAULT '[]'::jsonb,

  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_copart_operadora ON public.coparticipacao_catalogo(operadora_id);
CREATE INDEX idx_copart_plano ON public.coparticipacao_catalogo(operadora_id, plano_nome);

ALTER TABLE public.coparticipacao_catalogo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view coparticipacao catalogo"
  ON public.coparticipacao_catalogo FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage coparticipacao catalogo"
  ON public.coparticipacao_catalogo FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_coparticipacao_catalogo_updated_at
  BEFORE UPDATE ON public.coparticipacao_catalogo
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();