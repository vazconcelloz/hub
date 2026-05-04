## Objetivo
Atender 3 frentes:
1. Aplicar **gating real de permissões** nas rotas/menu (usando o modelo `has_permission` que já existe no banco).
2. **Enviar e-mail de convite** automaticamente quando um convite é criado (via edge function + Resend).
3. Criar **seção dedicada de "Gerenciar usuários"** acessível só para administradores (a tela já existe em `/app/configuracoes` aba Usuários — vou promovê-la a um item de menu próprio para admins e proteger a rota).

## Pré-requisito do item 2
O envio de e-mail real só funciona depois que você configurar um domínio de e-mail (já abri o diálogo para isso). A edge function será criada e o front passará a chamá-la; enquanto o domínio não estiver verificado, o convite continua sendo criado no banco e o link copiável já existente segue funcionando como fallback. Quando o domínio for verificado, o envio liga automaticamente sem novas alterações.

## Mudanças

### 1) Gating de permissões

**Novo: `src/components/RequirePermission.tsx`**
- Wrapper que checa `loading`/`isAdmin`/`has(permission)` via `usePermissions`.
- Se sem permissão, mostra tela "Acesso restrito" amigável (ícone + texto).
- Aceita `permission="cotacoes.ver"` ou `adminOnly`.

**`src/App.tsx`**
- Envolver cada rota interna com `<RequirePermission permission="...">`:
  - `/app/treinamentos` → `treinamentos.ver`
  - `/app/manuais` → `manuais.ver`
  - `/app/segmentacoes` → `segmentacoes.ver`
  - `/app/cotacoes`, `/app/cotacoes/saude/*`, `/app/cotacoes/automovel/*` → `cotacoes.ver`
  - `/app/cotacoes/saude/catalogo` → `catalogo.ver`
  - `/app/configuracoes` → `configuracoes.ver`
  - `/app/usuarios` (nova rota — ver item 3) → `adminOnly`
- `/app` (Início) continua livre para qualquer autenticado.

**`src/components/AppSidebar.tsx`**
- Filtrar os itens do menu pela permissão correspondente (esconde o item se o usuário não tem acesso).
- Adicionar novo item "Usuários" (ícone `UserCog`) visível **só para admins**, apontando para `/app/usuarios`.

### 2) Envio de e-mail de convite

**Nova edge function: `supabase/functions/send-convite-email/index.ts`**
- Recebe `{ convite_id }` no body, autenticada via JWT do admin.
- Busca o convite + dados do convidador no banco (com `SUPABASE_SERVICE_ROLE_KEY`).
- Monta link `${SITE_URL}/login?convite=<token>`.
- Tenta enviar via Resend usando `RESEND_API_KEY` (será solicitada se não existir) e o domínio configurado.
- Se não houver domínio/secret configurado, retorna `{ sent: false, reason: "email_not_configured" }` sem erro — o front avisa e mostra o link copiável.
- Configurar com `verify_jwt = true` em `supabase/config.toml`.

**`src/components/configuracoes/ConvitesTab.tsx`**
- Após criar o convite, chamar `supabase.functions.invoke("send-convite-email", { body: { convite_id }})`.
- Toast: "Convite enviado por e-mail" ou "Convite criado — copie o link" (fallback).
- Botão extra "Reenviar e-mail" em cada convite pendente.

### 3) Seção de configuração de usuários para admins

**Nova rota e página: `src/pages/UsuariosPage.tsx`**
- Wrapper enxuto (header + ícone) que renderiza o `UsuariosTab` já existente (reaproveitando 100% da lógica).
- Acessível em `/app/usuarios`, protegida por `RequirePermission adminOnly`.

**Sidebar (já citado)**
- Item "Usuários" com ícone `UserCog`, visível só para admin.

**Não removo a aba Usuários de `/app/configuracoes`** — ela continua como atalho. A nova página é apenas um destino dedicado, mais visível.

## Resultado esperado
- Usuários comuns só veem no menu o que podem acessar; tentar acessar URL bloqueada mostra "Acesso restrito".
- Admin vê item "Usuários" no menu lateral, abrindo a tela de gestão diretamente.
- Ao criar um convite, o e-mail é disparado automaticamente quando o domínio estiver configurado; antes disso, o fluxo atual de copiar link continua intacto.
