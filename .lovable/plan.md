

## Plano: Corrigir parser de faixas etárias e botão PDF

### Problemas identificados

1. **Soma errada**: O parser `parseFaixasEtarias` não lida com o formato brasileiro de valores. Valores como `R$1.021.63` viram `102163` em vez de `1021.63`. Além disso, faixas como `59+` não são reconhecidas pelo regex.

2. **PDF não abre**: O bucket `operadora-pdfs` provavelmente não está configurado como público. O `getPublicUrl` gera a URL mas o bucket precisa ser público para funcionar sem autenticação.

### Mudanças

| Arquivo | O que muda |
|---------|-----------|
| `src/lib/proposal-utils.ts` | Corrigir `parseFaixasEtarias` para: (a) tratar formato `1.021,63` e `1.021.63` corretamente; (b) suportar faixas abertas como `59+` ou `59-99` |
| **Migration SQL** | Criar policy de storage ou tornar o bucket `operadora-pdfs` público via SQL |
| `supabase/functions/extract-pdf-data/index.ts` | Padronizar o formato de saída das faixas etárias para usar vírgula como decimal (formato BR consistente: `1.021,63`) e sempre usar range com máximo (ex: `59-99` em vez de `59+`) |

### Detalhes técnicos

**Parser corrigido** — nova lógica para `parseFaixasEtarias`:
- Regex atualizado para aceitar `59+` como faixa (max = 99)
- Lógica de parse do valor: detectar se o último separador é ponto ou vírgula para distinguir milhares de decimais. Ex: `1.021,63` -> `1021.63`; `1.021.63` -> `1021.63` (último ponto = decimal); `412.35` -> `412.35`

**Bucket público** — executar via migration ou storage API para garantir que o bucket `operadora-pdfs` permite leitura pública (sem autenticação), assim o link "Ver PDF da Operadora" funciona na página pública.

