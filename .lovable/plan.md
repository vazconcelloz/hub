## Objetivo

Tratar uma operadora como entidade única (com vários planos por baixo), melhorar a extração de dados do PDF, permitir personalizar a cor das colunas no modo administrador e oferecer ao cliente um modo de comparação onde ele escolhe os planos a comparar (de uma ou mais operadoras, mais de 2 ao mesmo tempo).

---

## 1. Agrupamento por operadora (visual, sem mudar o banco)

Hoje, cada plano vira uma "coluna independente" mesmo quando vieram do mesmo PDF da mesma operadora. Vamos manter o modelo atual (1 linha por plano em `proposta_operadoras`), mas agrupar visualmente por `operadora_nome`.

Mudanças em `PublicPropostaPage.tsx`:
- Agrupar `viewOps` por `operadora_nome` (ex.: `Map<string, Operadora[]>`).
- Tabela comparativa: cabeçalho passa a ter **duas linhas**:
  - Linha 1: nome da operadora com `colspan` igual ao número de planos dela (visual de "marca" — cor de fundo configurável, ver item 3).
  - Linha 2: nome do plano (subcoluna).
- Mobile: cards agrupados por operadora; cada operadora vira uma seção com título + cards dos planos abaixo.
- Seção de "Detalhes faixas etárias" no rodapé: continua uma tabela por plano, mas precedida pelo nome da operadora.

Sem migração — só agrupamento na renderização. `operadora_nome` repetido nas linhas filhas é a chave do agrupamento.

## 2. Melhorar leitura do PDF (extract-pdf-data)

A extração já existe e devolve `planos[]`. Vamos reforçar:

- Confirmar e instruir mais explicitamente no system prompt que **um único PDF de uma operadora pode conter vários planos da mesma marca**, e todos devem ir em `planos[]` com o mesmo `operadora_nome` (não duplicar o nome da operadora dentro de `plano_nome`).
- Adicionar à tool schema, por plano: `coparticipacao`, `acomodacao`, `abrangencia`, `reembolso`, `resumo_cobertura` — porque hoje esses campos são extraídos no nível "operadora" e replicados para todos os planos. Em PDFs reais, planos da mesma operadora costumam diferir em coparticipação/acomodação/abrangência. A IA deve preencher por plano quando houver tabela comparativa; quando o campo for único no PDF, replica para todos.
- Manter os termos de busca já existentes para `valor_mensal`, e adicionar reforço para extrair valor por **faixa única total** (quando o PDF mostra apenas uma mensalidade fixa por plano sem tabela etária).
- Em `PropostaFormPage.handlePdfUpload`: ao construir cada `OperadoraForm` a partir de `planos[p]`, usar os campos por-plano quando vierem; cair para os campos compartilhados como fallback.
- Continuar usando o modelo gemini-2.5-flash com fallback (já implementado), sem mudanças no gateway.

## 3. Cor da coluna no modo edição

Adicionar personalização de cor por plano (coluna), persistida no banco.

Migração:
- Adicionar coluna `cor_coluna text` (nullable) em `proposta_operadoras`. Armazena um hex (`#RRGGBB`) ou um identificador de paleta (ex.: `navy`, `gold`, `emerald`...).

Edição:
- Em `PublicPropostaPage`, no modo admin, exibir um pequeno seletor de cor (botão com `popover` mostrando uma paleta pré-definida de 8 tons + "Sem cor") no topo de cada coluna na tabela e no header de cada card mobile.
- A cor escolhida pinta:
  - Header da coluna (plano) na tabela.
  - Borda superior do card mobile.
  - Badge do nome do plano.
- Salvar junto com o restante (`handleSave` passa a incluir `cor_coluna`).
- Cliente (não-admin) vê as cores aplicadas, mas sem o seletor.

Paleta sugerida (alinhada à identidade Navy & Gold): navy, gold, emerald, ruby, indigo, slate, teal, copper.

## 4. Modo comparação (cliente)

Botão "Comparar planos" disponível para qualquer visitante (não exige login). Permite:

- Selecionar 2 ou mais planos (sem limite máximo, mas com aviso visual quando passa de 4 — só por usabilidade em telas estreitas).
- Planos podem ser de operadoras iguais ou diferentes.
- Abrir uma visualização focada com **apenas os planos selecionados**, lado a lado, usando a mesma estrutura de tabela comparativa já existente (mesmos critérios + mensalidade total + faixas etárias).

Implementação:
- Adicionar checkbox no header de cada coluna (desktop) e no header de cada card (mobile).
- Estado local `selectedPlans: Set<string>` (ids de `proposta_operadoras`).
- Botão flutuante no rodapé: "Comparar X planos selecionados" — habilitado a partir de 2.
- Ao clicar, abre um `Dialog` (cheio em mobile, modal grande em desktop) com a tabela comparativa renderizada apenas para os ids selecionados, mantendo o agrupamento por operadora.
- Botões dentro do diálogo: "Falar com a consultora sobre estes planos" → WhatsApp com mensagem listando os planos escolhidos; "Fechar".
- Não persiste seleção no banco — é interação do cliente.

## 5. Detalhes técnicos

**Arquivos afetados**
- `supabase/functions/extract-pdf-data/index.ts` — schema dos planos enriquecido (campos por plano), system prompt reforçado para multi-plano por operadora.
- `src/pages/PublicPropostaPage.tsx` — agrupamento por operadora, seletor de cor, checkboxes e diálogo de comparação.
- `src/pages/PropostaFormPage.tsx` — usar campos por-plano vindos do extractor; suporte a `cor_coluna`.
- `src/lib/proposal-utils.ts` — exportar tipo `Operadora` com `cor_coluna?: string | null` e helper `agruparPorOperadora(ops)`.
- Nova migration: `ALTER TABLE proposta_operadoras ADD COLUMN cor_coluna text;`

**Fora do escopo**
- Permitir reordenar planos dentro de uma operadora por drag-and-drop na página pública (continua só pelo editor completo).
- Compartilhar via link uma comparação específica (URL com ids selecionados) — pode ser um próximo passo se quiser.
- Renomear/mesclar operadoras já salvas em propostas antigas (continua sendo edição manual via formulário completo).
