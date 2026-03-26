

## Plano: Restringir cadastro ao domínio @grupofbn.com.br

### Mudanças

| Arquivo | O que muda |
|---------|-----------|
| `src/contexts/AuthContext.tsx` | Validar domínio do email antes de chamar `signUp`. Rejeitar com erro se não for `@grupofbn.com.br` |
| `src/pages/LoginPage.tsx` | Adicionar validação visual no campo de email durante cadastro, mostrando hint "Apenas emails @grupofbn.com.br" |
| **Auth config** | Habilitar auto-confirm para que contas criadas com o domínio correto possam fazer login imediatamente sem precisar verificar email |

### Detalhes técnicos

**Validação client-side (AuthContext)**: No `signUp`, antes de chamar `supabase.auth.signUp`, verificar se `email.endsWith('@grupofbn.com.br')`. Se não, retornar `{ error: new Error("Apenas emails @grupofbn.com.br podem criar conta.") }`.

**Validação server-side (Edge Function)**: Criar uma edge function `validate-signup` que verifica o domínio. Porém, como a abordagem mais simples e eficaz é usar um **database trigger** que rejeita inserts em `auth.users` com domínio diferente — isso não é permitido em schemas reservados. Então a validação client-side + a restrição visual são a camada principal, e um hook de signup server-side pode ser adicionado futuramente.

**Auto-confirm**: Usar `cloud--configure_auth` para habilitar auto-confirm de email, já que os emails são restritos a um domínio corporativo confiável, eliminando a necessidade de verificação por email.

**UI**: No modo de cadastro, mostrar texto informativo "Apenas emails @grupofbn.com.br" abaixo do campo de email. Placeholder muda para "nome@grupofbn.com.br".

