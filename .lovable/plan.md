## Objetivo

Resolver três pontos no comparativo da proposta pública:

1. **Tabela separada por operadora** — hoje todas as operadoras compartilham uma única tabela com cabeçalho duplo. Vamos quebrar em **uma tabela por operadora** (apenas com os planos daquela marca), exibidas em sequência.
2. **Pintar coluna inteira OU célula isolada** — hoje só dá pra escolher uma cor que pinta o header da coluna. Vamos permitir, no modo admin, escolher a cor por **coluna (plano)** e também por **célula individual** (qualquer critério: coparticipação, acomodação, etc.).
3. **Mais opções de cores** — ampliar a paleta atual de 8 para ~20 tons, com tons claros e fortes.

---

## 1. Uma tabela por operadora

Em `PublicPropostaPage.tsx`:

- Remover a tabela única que agrupa todas as operadoras com `colspan`.
- Iterar sobre `grupos = agruparPorOperadora(viewOps)` e renderizar **uma `renderComparativeTable(grupo.planos)` por operadora**, cada uma precedida por um header com o nome da operadora (estilo "seção").
- Dentro de cada tabela, o cabeçalho duplo desaparece (só sobra a linha dos planos), porque já é uma tabela exclusiva daquela operadora.
- Visitante continua podendo selecionar planos de tabelas diferentes para o modo de comparação (a seleção é global, não por tabela).
- Mobile: já é agrupado por operadora — fica praticamente igual, só ajustando o header da seção para ficar consistente com o desktop.

Exemplo visual (desktop):

```text
┌───────────────────────────────────────────┐
│ AMIL                                      │
├──────────────┬─────────────┬──────────────┤
│              │  Plano S750 │  Plano S380  │
│ Coparticip.  │  Sim        │  Não         │
│ Acomodação   │  Apto       │  Enferm.     │
│ ...          │  ...        │  ...         │
│ MENSALIDADE  │  R$ 1.200   │  R$ 890      │
└──────────────┴─────────────┴──────────────┘

┌───────────────────────────────────────────┐
│ BRADESCO SAÚDE                            │
├──────────────┬─────────────┐
│              │  Top Nacional│
│ ...          │  ...         │
└──────────────┴──────────────┘
```

## 2. Cor por coluna OU por célula

**Banco** — nova migração:

- Adicionar coluna `cores_celulas jsonb` (nullable) em `proposta_operadoras`. Estrutura:
  ```json
  { "coparticipacao": "emerald", "acomodacao": "ruby" }
  ```
  A chave é o nome do critério (mesmo `field` usado em `criterios[]`); o valor é o id da paleta.
- `cor_coluna` (já existe) continua sendo a cor do header/plano inteiro.

**Modo admin (UI)**:

- O `ColorPicker` atual continua disponível no header do plano (pinta a coluna inteira — header).
- **Novo**: em cada célula editável, no modo admin, aparece um pequeno botão `Palette` (ícone só) ao lado do input. Abre um popover com a mesma paleta + opção "Sem cor". Ao escolher, grava em `cores_celulas[campo]`.
- Cliente (não-admin) só vê a cor aplicada — sem botões.

**Renderização**:

- A célula resolve a cor nesta ordem:
  1. `cores_celulas[campo]` se existir → usa essa cor (background + texto contrastante).
  2. Senão, sem fundo (mantém zebra atual).
- O header do plano continua usando `cor_coluna`.
- Importante: a cor da célula é **independente** da cor da coluna — uma célula pode estar pintada mesmo se a coluna não estiver, e vice-versa.

## 3. Paleta ampliada

Atualizar `COLUNA_COLORS` em `src/lib/proposal-utils.ts` para ~20 entradas, incluindo:

- **Tons fortes (já existentes)**: navy, gold, emerald, ruby, indigo, slate, teal, copper.
- **Novos tons fortes**: violet, rose, amber, sky, lime, fuchsia, cyan.
- **Tons claros (pasteis)** — úteis especialmente para pintar células sem ofuscar o texto: mint, peach, lavender, sand, blush.

Para cada cor, manter os 3 campos `header` (forte, texto branco), `border` e `badge`. Adicionar um quarto campo `cell` para o uso em células — para cores fortes, usaremos uma versão suave (ex.: `bg-emerald-100 text-emerald-900`) para não competir com o conteúdo.

O grid do popover passa de `grid-cols-4` para `grid-cols-5`, com tooltip mostrando o nome da cor.

## 4. Detalhes técnicos

**Arquivos afetados**

- `src/pages/PublicPropostaPage.tsx`:
  - Quebrar `renderComparativeTable` para receber apenas planos de uma operadora (sem header de agrupador).
  - Renderizar 1 tabela por grupo no desktop, com título da operadora acima.
  - Adicionar `CellColorPicker` no modo edição em cada célula.
  - Aplicar `cell` color nas `<td>` das tabelas e nos itens dos cards mobile.
  - Incluir `cores_celulas` em `handleSave` e em `EditableOperadoraField`.
- `src/lib/proposal-utils.ts`:
  - Estender `ColorPaletteEntry` com `cell: string`.
  - Ampliar `COLUNA_COLORS` (~20 entradas).
  - Helper `getCellColorClass(op, field)` que devolve a classe de fundo/texto da célula.
- `supabase/migrations/<timestamp>_cores_celulas.sql`:
  ```sql
  ALTER TABLE public.proposta_operadoras
    ADD COLUMN IF NOT EXISTS cores_celulas jsonb;
  ```

**Fora do escopo**

- Editar cor por linha inteira (todas operadoras de um critério).
- Reordenar planos dentro da tabela via drag-and-drop.
- Sincronizar a paleta com tokens de design (continua hardcoded — pode ser refatorado depois).
