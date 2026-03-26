

## Plano: Melhorar exibição da rede credenciada, remover botão individual e garantir todos os planos

### Mudanças

1. **Rede credenciada — máximo 5 hospitais, exibição visual melhorada**
   - Na edge function, atualizar o prompt para instruir a IA a retornar no máximo 5 hospitais/laboratórios mais próximos
   - Na página pública, exibir a rede credenciada como lista com ícones em vez de texto corrido

2. **Remover botão "Tenho interesse nesta opção"**
   - Remover o botão WhatsApp individual de cada card de operadora (linhas 183-188)
   - Manter apenas o botão "Ver PDF da Operadora" e o botão final de contato com a consultora

3. **Garantir que todos os planos da proposta são exibidos**
   - Verificar que a query não limita os resultados — já usa `.order("ordem_exibicao")` sem limit, então todos os planos devem aparecer. Vou verificar se há algum filtro no formulário admin que esteja impedindo o salvamento de operadoras.

### Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/extract-pdf-data/index.ts` | Atualizar descrição do campo `rede_credenciada_resumo` para limitar a 5 hospitais mais próximos; atualizar prompt de enriquecimento |
| `src/pages/PublicPropostaPage.tsx` | Remover botão "Tenho interesse nesta opção"; reformatar rede credenciada como lista com ícones (cada hospital em uma linha com bullet); limitar visualmente a 5 itens |

### Detalhes técnicos

**Edge function** — campo `rede_credenciada_resumo`:
- Descrição atualizada: "Liste no máximo 5 hospitais e laboratórios da rede credenciada mais próximos da região do cliente, um por linha. Apenas nomes."
- Prompt de enriquecimento: "Liste os 5 principais hospitais da rede {operadora} na região de {cidade}/{estado}. Um por linha, apenas nomes."

**Página pública** — rede credenciada:
- Separar o texto por quebras de linha e renderizar como lista com `CheckCircle` icons
- Limitar a exibição a 5 itens no máximo
- Remover completamente o bloco do botão WhatsApp individual por operadora

