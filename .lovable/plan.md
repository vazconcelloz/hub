## Plano: Reformatar a proposta pública como tabela comparativa horizontal (estilo FBN)

Hoje a página `/cotacao/[slug]` mostra cada operadora em um card vertical separado. A imagem de referência mostra um formato muito mais útil: **uma única tabela comparativa horizontal**, com critérios nas linhas e operadoras/planos nas colunas — fica fácil bater olho e comparar.

### Como vai ficar

```text
┌───────────────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ COMPARATIVO DE PLANOS — TODAS AS OPÇÕES                             [logo]  │
├───────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Critério              │ Operadora A │ Operadora B │ Operadora C │ Operadora D │
│                       │ Plano X     │ Plano Y     │ Plano Z     │ Plano W     │
├───────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Coparticipação        │ Não         │ Sim         │ Não         │ Sim         │
│ Acomodação            │ Apto        │ Enfermaria  │ Apto        │ Apto        │
│ Abrangência           │ Nacional    │ Estadual    │ Nacional    │ Nacional    │
│ Reembolso             │ R$ 1.031    │ R$ 880      │ —           │ R$ 439      │
│ Cobertura             │ ...         │ ...         │ ...         │ ...         │
│ Rede credenciada      │ Hosp 1...   │ Hosp 1...   │ Hosp 1...   │ Hosp 1...   │
├───────────────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ MENSALIDADE TOTAL     │ R$ 56.600   │ R$ 39.306   │ R$ 40.029   │ R$ 40.820   │ ← linha destaque
│ Economia vs. mais caro│ —           │ R$ 17.294   │ R$ 16.571   │ R$ 15.780   │
└───────────────────────┴─────────────┴─────────────┴─────────────┴─────────────┘

[Notas/observações abaixo]
[Bloco da consultora + botão WhatsApp]
```

### Mudanças no código

**Arquivo único alterado:** `src/pages/PublicPropostaPage.tsx`

1. **Hero**: manter, mas mais enxuto (título + nome do cliente + cidade/validade). Trocar o título para "Comparativo de Planos".

2. **Substituir o grid de cards por uma tabela comparativa**:
   - Primeira coluna fixa = **rótulos dos critérios** (Plano, Coparticipação, Acomodação, Abrangência, Reembolso, Cobertura, Rede Credenciada, Mensalidade Total).
   - Demais colunas = **uma por operadora** (`operadoras.map`), cabeçalho mostrando `operadora_nome` + `plano_nome` + badge de destaque (`Mais Econômico`, etc.) quando houver.
   - Linha **"Mensalidade Total"** com destaque visual (fundo escuro, texto grande/branco) — usa `valor_mensal` ou, se houver `faixas_etarias` + `idades_beneficiarios`, o total calculado por `calcularTotalPorFaixas`.
   - Linha extra **"Economia vs. mais caro"** calculada no client (maior total − total da coluna), exibida só se houver mais de uma operadora com valor.
   - Cores alternadas por coluna (sutis) lembrando a referência, mas usando os tokens do `index.css` (sem cores hardcoded).

3. **Responsividade**:
   - Desktop/tablet: tabela horizontal completa dentro de um wrapper com `overflow-x-auto` (rola lateralmente se houver muitas operadoras).
   - Mobile (<768px): a tabela horizontal fica difícil de ler, então **manter um fallback em cards empilhados** (basicamente o layout atual, simplificado). Controlado por classes Tailwind `hidden md:table` / `md:hidden`.

4. **Detalhamento por beneficiário e tabela de faixas etárias**: mover para uma seção **abaixo** da tabela comparativa, em accordion/cards colapsáveis por operadora (mantém a info, mas tira do caminho da comparação principal). Reaproveita a lógica já existente.

5. **PDF da operadora**: vira um link pequeno ("Ver PDF") no rodapé de cada coluna, em vez de botão grande.

6. **Botão de WhatsApp da consultora**: manter o card final + botão fixo no canto. Sem mudanças.

7. **Observações gerais**: manter o card abaixo da tabela.

### Detalhes técnicos

- Usar `<table>` semântica com `<thead>`, `<tbody>`, `<tfoot>` para acessibilidade e impressão.
- Classes Tailwind: `border-collapse`, `border`, `border-border`, `bg-muted/30` para linhas alternadas, `bg-primary text-primary-foreground` na linha de mensalidade total.
- Helper interno `getTotalMensal(op)` que retorna `op.valor_mensal` ou recalcula via `calcularTotalPorFaixas` quando aplicável — assim a linha Total e a Economia ficam consistentes.
- Sem novas dependências, sem mudanças de schema, sem edge functions.
- O destaque comercial (`destaque_comercial`) vira um `Badge` no cabeçalho da coluna correspondente.

### Fora de escopo (não mexer)

- Schema do banco / edge functions.
- Auth / login.
- Página de admin / formulário de proposta.
