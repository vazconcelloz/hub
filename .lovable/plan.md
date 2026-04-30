## Objetivo

Transformar este projeto no **Hub Grupo FBN**: um portal corporativo com sidebar permanente onde cada item é uma seção da empresa. O sistema atual de propostas de saúde vira o "recheio" do módulo **Cotações** — tudo que já existe continua funcionando, só passa a viver dentro da nova casca do hub.

## Visual e identidade

- Paleta nova do hub: **branco / off-white (#F8F9FB) + azul-marinho profundo (#0B2545 / #13315C)** + acentos sutis em cinza-azulado.
- Tipografia limpa (Inter), muito espaço em branco, sombras leves, bordas arredondadas suaves.
- Estilo: moderno, clean, corporativo — coeso em todas as seções.
- Layout em **light mode** como padrão (mantém o toggle de tema existente, mas a paleta clara é a principal).
- O sistema de Cotações continua funcionando com a paleta Navy & Gold internamente (porque a página pública da proposta precisa daquela identidade premium); apenas o **chrome do hub** (sidebar, header, telas internas dos novos módulos) usa a nova identidade clara.

## Autenticação restrita @grupofbn.com.br

- Tela de login única em `/login` com email + senha e botão Google.
- **Defesa em profundidade**:
  - Front: validação Zod bloqueia qualquer e-mail que não termine em `@grupofbn.com.br` antes de chamar o backend, com mensagem clara.
  - Banco: trigger em `auth.users` (BEFORE INSERT) que rejeita o cadastro se o domínio do e-mail não for `@grupofbn.com.br`. Isso protege também o login Google e chamadas diretas à API.
- Auto-confirm continua ligado (acesso imediato após cadastro válido).
- Todas as rotas internas do hub passam por um `RequireAuth` que redireciona para `/login` se não houver sessão.
- Páginas públicas existentes (`/cotacao/:slug`) **continuam abertas sem login** — o cliente final não precisa autenticar.

## Estrutura de navegação (sidebar)

Sidebar permanente à esquerda (colapsável para modo ícone), com header superior contendo logo, busca futura e menu do usuário (avatar, e-mail, sair).

```text
Hub Grupo FBN
├── Início                /app
├── Treinamentos          /app/treinamentos
├── Manuais               /app/manuais
├── Segmentações          /app/segmentacoes
└── Cotações              /app/cotacoes  ← sistema atual de propostas
    ├── Dashboard         /app/cotacoes
    ├── Nova proposta     /app/cotacoes/proposta/new
    ├── Editar            /app/cotacoes/proposta/:id
    └── Catálogo          /app/cotacoes/catalogo
```

Rotas públicas (fora do hub, sem sidebar e sem login):
- `/login` — autenticação
- `/cotacao/:slug` — proposta pública para o cliente final (mantida igual)

Redirecionamentos:
- `/` → `/app` (se logado) ou `/login` (se não)
- `/admin`, `/admin/proposta/:id`, `/admin/catalogo`, `/admin/cotacao/:slug` → redirecionam para os equivalentes em `/app/cotacoes/...` para não quebrar links antigos.

## Conteúdo de cada módulo

**Início** — dashboard de boas-vindas com saudação personalizada, cards de atalhos para os módulos, cards de "últimas atividades" (placeholder por enquanto: últimas propostas criadas, vindas do banco).

**Treinamentos** — listagem em grid de cards de treinamentos. Estrutura pronta com tabela `treinamentos` (título, descrição, categoria, link/vídeo, thumbnail, ordem) + tela de listagem + tela de detalhe. Vem com estado vazio elegante e botão "Adicionar treinamento" (admin). Sem conteúdo real ainda — você popula depois.

**Manuais** — listagem de manuais (PDFs/documentos). Tabela `manuais` (título, descrição, categoria, arquivo_url, atualizado_em). Upload para um bucket `manuais` privado, listagem em cards com download/visualizar. Filtro por categoria.

**Segmentações** — área para campanhas/listas segmentadas de clientes. Estrutura inicial: tabela `segmentacoes` (nome, descrição, critérios em JSON, criado_por, total_contatos). Tela de listagem + criação/edição com formulário simples. Conteúdo inicial vazio, pronto para evoluir.

**Cotações** — **TUDO que já existe hoje**, intocado funcionalmente, apenas embrulhado pelo layout do hub:
- Dashboard de propostas (atual `DashboardPage`)
- Formulário de proposta (atual `PropostaFormPage`)
- Catálogo de operadoras / rede / coparticipação (atual `CatalogoPage`)
- Extração por IA, grupo de soma, faixas etárias, tudo continua igual.

## Mudanças técnicas (seção para o lado dev)

1. **Novo layout** `src/components/HubLayout.tsx` usando `SidebarProvider` + `Sidebar` do shadcn (`collapsible="icon"`), com `AppSidebar` próprio listando os 5 módulos. Header fixo com `SidebarTrigger`, breadcrumb e menu de usuário.
2. **Novo `RequireAuth`** wrapper que checa sessão Supabase e redireciona para `/login`.
3. **Nova página** `src/pages/LoginPage.tsx` com tabs login/cadastro, validação Zod do domínio, login Google.
4. **Novas páginas placeholder com CRUD básico**: `InicioPage`, `TreinamentosPage` (+ `TreinamentoDetalhePage`), `ManuaisPage`, `SegmentacoesPage` (+ form).
5. **Reestruturar `App.tsx`** com as novas rotas, agrupando as rotas autenticadas dentro de `<Route element={<RequireAuth><HubLayout/></RequireAuth>}>` e mantendo `/cotacao/:slug` e `/login` como públicas. Criar `Navigate` legados para `/admin/*`.
6. **Renomear visualmente** as páginas existentes para se encaixarem (sem mexer na lógica): `DashboardPage`, `PropostaFormPage`, `CatalogoPage` continuam no mesmo arquivo, só passam a ser renderizadas pelas rotas `/app/cotacoes/*`. Os links internos delas (ex.: botão "Catálogo" no header) precisam apontar para os novos paths.
7. **CSS tokens**: adicionar nova paleta clara em `src/index.css` (variáveis `--hub-bg`, `--hub-surface`, `--hub-primary`, `--hub-primary-foreground`, `--hub-border`) e aplicar no `HubLayout` e novas páginas. As páginas de Cotações continuam usando os tokens Navy & Gold atuais.
8. **Migrações Supabase**:
   - Trigger `validate_grupofbn_email()` em `auth.users` BEFORE INSERT que faz `RAISE EXCEPTION` se `email NOT ILIKE '%@grupofbn.com.br'`.
   - Tabela `treinamentos` (id, titulo, descricao, categoria, video_url, thumbnail_url, ordem, ativo, created_at, updated_at) com RLS: SELECT autenticado liberado; INSERT/UPDATE/DELETE só admin (usando `has_role`).
   - Tabela `manuais` (id, titulo, descricao, categoria, arquivo_url, tamanho_bytes, atualizado_em, created_at). Mesma política RLS.
   - Tabela `segmentacoes` (id, nome, descricao, criterios jsonb, total_contatos int, criado_por uuid, created_at, updated_at). RLS: usuário vê/edita as próprias; admin vê tudo.
   - Bucket privado `manuais` com policy de leitura para autenticados.
9. **Memórias**: atualizar `mem://index.md` com a nova estrutura de hub e adicionar `mem://hub/estrutura` documentando módulos e restrição de domínio.

## O que NÃO muda

- Toda a lógica do sistema atual de propostas (extração IA, cálculo por faixa etária, grupo de soma, página pública, catálogo, edge functions) — **zero alteração funcional**.
- A página pública `/cotacao/:slug` continua exatamente como está hoje (mesma identidade Navy & Gold, mesmo CTA único de WhatsApp).
- Tabelas existentes (`propostas`, `proposta_operadoras`, catálogos) — sem migração nelas.

## Resultado esperado

Você abre `/`, é mandado para `/login`, entra com `voce@grupofbn.com.br`, cai no `/app` (Início) com a sidebar à esquerda mostrando os 5 módulos. Clica em **Cotações** e tem o dashboard de propostas exatamente como hoje, só que dentro do shell do hub. Os outros 4 módulos abrem com tela funcional vazia, prontos para receber conteúdo.

Posso seguir com essa implementação?
