
-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  telefone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins update all profiles" ON public.profiles
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-criar profile + role 'user' no signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, display_name)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger de validação de e-mail (recriar)
DROP TRIGGER IF EXISTS validate_email_trigger ON auth.users;
CREATE TRIGGER validate_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.validate_grupofbn_email();

-- ============ SETORES ============
CREATE TABLE public.setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  cor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view setores" ON public.setores
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage setores" ON public.setores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_setores_updated_at
  BEFORE UPDATE ON public.setores
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PERMISSOES (catálogo) ============
CREATE TABLE public.permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,           -- ex: cotacoes.criar, manuais.editar
  nome TEXT NOT NULL,
  descricao TEXT,
  modulo TEXT NOT NULL,                 -- ex: cotacoes, manuais, treinamentos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view permissoes" ON public.permissoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage permissoes" ON public.permissoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Sementes de permissões
INSERT INTO public.permissoes (chave, nome, modulo, descricao) VALUES
  ('cotacoes.ver',       'Ver cotações',         'cotacoes',     'Acessar a lista de propostas'),
  ('cotacoes.criar',     'Criar cotação',        'cotacoes',     'Criar nova proposta'),
  ('cotacoes.editar',    'Editar cotação',       'cotacoes',     'Editar propostas existentes'),
  ('cotacoes.excluir',   'Excluir cotação',      'cotacoes',     'Excluir propostas'),
  ('catalogo.ver',       'Ver catálogo',         'catalogo',     'Ver operadoras, planos, rede'),
  ('catalogo.editar',    'Editar catálogo',      'catalogo',     'Gerenciar catálogo'),
  ('treinamentos.ver',   'Ver treinamentos',     'treinamentos', 'Acessar treinamentos'),
  ('treinamentos.editar','Editar treinamentos',  'treinamentos', 'Gerenciar treinamentos'),
  ('manuais.ver',        'Ver manuais',          'manuais',      'Acessar manuais'),
  ('manuais.editar',     'Editar manuais',       'manuais',      'Gerenciar manuais'),
  ('segmentacoes.ver',   'Ver segmentações',     'segmentacoes', 'Ver segmentações'),
  ('segmentacoes.editar','Editar segmentações',  'segmentacoes', 'Gerenciar segmentações'),
  ('configuracoes.ver',  'Ver configurações',    'configuracoes','Acessar área de configurações'),
  ('usuarios.gerenciar', 'Gerenciar usuários',   'configuracoes','Convidar e gerenciar usuários');

-- ============ SETOR -> PERMISSOES ============
CREATE TABLE public.setor_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  permissao_chave TEXT NOT NULL REFERENCES public.permissoes(chave) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (setor_id, permissao_chave)
);
ALTER TABLE public.setor_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth view setor_permissoes" ON public.setor_permissoes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage setor_permissoes" ON public.setor_permissoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ USER -> SETORES ============
CREATE TABLE public.user_setores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  setor_id UUID NOT NULL REFERENCES public.setores(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, setor_id)
);
ALTER TABLE public.user_setores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own setores" ON public.user_setores
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all user_setores" ON public.user_setores
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage user_setores" ON public.user_setores
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ USER -> PERMISSOES (overrides) ============
CREATE TABLE public.user_permissoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permissao_chave TEXT NOT NULL REFERENCES public.permissoes(chave) ON DELETE CASCADE,
  concedida BOOLEAN NOT NULL DEFAULT true, -- true=concede extra, false=revoga
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, permissao_chave)
);
ALTER TABLE public.user_permissoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own permissoes" ON public.user_permissoes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins view all user_permissoes" ON public.user_permissoes
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage user_permissoes" ON public.user_permissoes
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ CONVITES ============
CREATE TABLE public.convites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  role public.app_role NOT NULL DEFAULT 'user',
  setor_id UUID REFERENCES public.setores(id) ON DELETE SET NULL,
  convidado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pendente', -- pendente|aceito|cancelado
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  expira_em TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  aceito_em TIMESTAMPTZ
);
ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage convites" ON public.convites
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============ FUNÇÃO has_permission ============
CREATE OR REPLACE FUNCTION public.has_permission(_user_id UUID, _chave TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    -- Admin tem tudo
    public.has_role(_user_id, 'admin')
    OR
    -- Override individual concedido
    EXISTS (
      SELECT 1 FROM public.user_permissoes
      WHERE user_id = _user_id AND permissao_chave = _chave AND concedida = true
    )
    OR
    -- Permissão via setor (e não foi revogada por override)
    (
      EXISTS (
        SELECT 1 FROM public.user_setores us
        JOIN public.setor_permissoes sp ON sp.setor_id = us.setor_id
        WHERE us.user_id = _user_id AND sp.permissao_chave = _chave
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.user_permissoes
        WHERE user_id = _user_id AND permissao_chave = _chave AND concedida = false
      )
    );
$$;
