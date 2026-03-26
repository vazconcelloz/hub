

## Plano: Faixas etárias do PDF + previsão de reajuste no final da proposta

### O que muda

1. **Remover** o campo "Faixa Etária / Perfil" da seção "Dados do Cliente" no formulário admin
2. **Extrair faixas etárias do PDF** via IA — adicionar campo `faixas_etarias` ao schema de extração
3. **Armazenar faixas etárias** em novo campo na tabela `proposta_operadoras`
4. **Exibir no final da proposta pública** uma seção com as faixas etárias usadas e uma previsão de reajuste por mudança de faixa

### Arquivos a criar/modificar

| Arquivo | Mudança |
|---------|---------|
| **Migration SQL** | Adicionar coluna `faixas_etarias` (text) na tabela `proposta_operadoras`; remover obrigatoriedade de `faixa_etaria_ou_perfil` em `propostas` se necessário |
| `supabase/functions/extract-pdf-data/index.ts` | Adicionar `faixas_etarias` e `previsao_reajuste_faixa` ao schema do tool calling — extrair tabela de faixas etárias e valores do PDF |
| `src/pages/PropostaFormPage.tsx` | Remover campo "Faixa Etária / Perfil" do card de dados do cliente; adicionar campo readonly de faixas etárias no card de cada operadora (preenchido via extração); salvar no banco |
| `src/pages/PublicPropostaPage.tsx` | Adicionar seção no final (antes das observações) mostrando tabela de faixas etárias usadas + previsão de reajuste por troca de faixa |
| `src/lib/proposal-utils.ts` | Adicionar tipos atualizados |

### Detalhes técnicos

**Edge function** — novos campos no tool calling:
- `faixas_etarias`: string descrevendo as faixas e valores encontrados no PDF (ex: "0-18: R$250 | 19-23: R$310 | 24-28: R$380...")
- `previsao_reajuste_faixa`: string com explicação de como o valor muda ao trocar de faixa etária

**Banco de dados** — migration:
- `ALTER TABLE proposta_operadoras ADD COLUMN faixas_etarias text;`
- `ALTER TABLE proposta_operadoras ADD COLUMN previsao_reajuste_faixa text;`

**Página pública** — nova seção "Faixas Etárias e Reajustes":
- Para cada operadora que tem dados de faixa, exibir uma tabela/lista com as faixas e valores
- Abaixo, mostrar a previsão de reajuste explicando como o valor muda conforme a idade

**Formulário admin**:
- Remove o input "Faixa Etária / Perfil" do card de dados do cliente
- Adiciona campo textarea readonly (ou editável) "Faixas Etárias" em cada card de operadora, preenchido pela extração do PDF

