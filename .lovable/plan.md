

## Plano: Somar valores das faixas etárias cotadas e apresentar total por plano

### Problema atual
As faixas etárias são extraídas como texto livre. Não há como saber quais idades estão sendo cotadas, nem calcular o valor total somando os valores individuais de cada beneficiário por plano.

### O que muda

1. **Adicionar campo "Idades dos beneficiários"** na seção Dados do Cliente (ex: "35, 28, 5") — essas são as idades das pessoas que estão sendo cotadas
2. **Extrair faixas etárias de forma estruturada** — a IA já extrai as faixas, mas vamos garantir um formato parseável (ex: "0-18: 250.00 | 19-23: 310.00 | ...")
3. **Calcular automaticamente** o valor total por plano: para cada idade informada, encontrar a faixa correspondente, pegar o valor, e somar
4. **Exibir na proposta pública** uma tabela com o detalhamento (cada beneficiário, sua faixa, o valor) e o total por plano

### Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| **Migration SQL** | Adicionar coluna `idades_beneficiarios` (text) na tabela `propostas` |
| `src/pages/PropostaFormPage.tsx` | Adicionar campo "Idades dos beneficiários" no card de dados do cliente; atualizar `valor_mensal` automaticamente com a soma das faixas quando as idades e faixas estiverem preenchidas |
| `src/pages/PublicPropostaPage.tsx` | Na seção de faixas etárias, exibir tabela com cada beneficiário, sua faixa, valor individual, e o **valor total** por plano |
| `src/lib/proposal-utils.ts` | Adicionar funções utilitárias: `parseFaixasEtarias(text)` para converter o texto em array de `{min, max, valor}` e `calcularTotalPorFaixas(idades[], faixas[])` para retornar o detalhamento e total |

### Detalhes técnicos

**Campo de idades**: texto simples com idades separadas por vírgula (ex: "35, 28, 5, 62"). Armazenado na tabela `propostas`.

**Parser de faixas**: converte texto como `"0-18: R$250,00 | 19-23: R$310,50"` em estrutura `[{min: 0, max: 18, valor: 250}, {min: 19, max: 23, valor: 310.5}]`.

**Cálculo do total**: para cada idade, encontra a faixa que contém aquela idade (min <= idade <= max) e soma os valores. O `valor_mensal` da operadora pode ser atualizado automaticamente com essa soma.

**Exibição na proposta pública**: para cada operadora, mostrar:
- Tabela: Beneficiário | Idade | Faixa | Valor
- Linha final: **Total mensal: R$ X.XXX,XX**

