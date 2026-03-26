

## Plano: Extrair múltiplos planos de um único PDF

### Problema
O PDF da Amil contém **5 planos em uma única tabela** (Amil Black I QP R1, R2, R3 e Amil Black S2500 QP R1, R2), cada um com valores por faixa etária. O sistema atual extrai apenas 1 plano por PDF. Precisamos extrair todos os planos separadamente, cada um com seus valores por vida e total.

### Mudanças

| Arquivo | O que muda |
|---------|-----------|
| `supabase/functions/extract-pdf-data/index.ts` | Alterar a extração para retornar um **array de planos** em vez de um único plano. Cada plano terá: nome, valores por faixa etária, e o valor total. Campos comuns (operadora, coparticipação, acomodação, rede credenciada) são compartilhados. |
| `src/pages/PropostaFormPage.tsx` | Ao receber múltiplos planos do PDF, criar automaticamente uma operadora para cada plano extraído (em vez de preencher apenas uma). O PDF file é compartilhado entre todas. |
| `src/pages/PublicPropostaPage.tsx` | Cada card de plano já mostra o detalhamento por beneficiário e total — sem mudanças estruturais necessárias. |

### Detalhes técnicos

**Nova estrutura de extração (edge function)**:
- Adicionar uma nova tool function `extract_multiple_plans` que retorna um array de planos
- Cada plano: `{ plano_nome, faixas_etarias (formato "0-18: R$921,64 | 34-38: R$1.657,59 | ..."), valor_total }`
- Campos compartilhados: `operadora_nome, coparticipacao, acomodacao, abrangencia, reembolso, resumo_cobertura, rede_credenciada_resumo, previsao_reajuste_faixa`

**Lógica no formulário admin (handlePdfUpload)**:
- Se a resposta contiver `planos` (array), criar N operadoras a partir do índice atual
- Cada operadora recebe o mesmo `pdf_file`, `operadora_nome`, `coparticipacao`, `acomodacao`, etc.
- Cada uma recebe seu próprio `plano_nome`, `faixas_etarias`, e `valor_mensal` calculado

**Exibição na proposta pública**:
- Cada plano já aparece como card separado — funciona automaticamente
- O detalhamento por beneficiário mostra o valor de cada vida no plano e o total

