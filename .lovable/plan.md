## Objetivo
Simplificar a página `/app` (Início) removendo a seção de cards de Módulos e a seção de estatísticas (dashboards: Propostas, Treinamentos, Manuais).

## Mudanças
**Arquivo:** `src/pages/InicioPage.tsx`

1. Remover a `<section>` com os 3 cards de stats (Propostas / Treinamentos / Manuais).
2. Remover a `<section>` "Módulos" com os 4 cards (Cotações, Treinamentos, Manuais, Segmentações).
3. Remover o `useEffect` e o `useState` de `stats`, além das chamadas `supabase.from(...).select(...count...)`.
4. Remover a constante `modulos` e os imports não usados (`Link`, `Card`, `GraduationCap`, `BookOpen`, `Target`, `FileSpreadsheet`, `ArrowRight`).
5. Manter apenas o cabeçalho com a saudação personalizada ("Olá, {nome}" + "Bem-vindo ao Hub Grupo FBN.").

## Resultado
A página `/app` fica como uma tela limpa de boas-vindas, contendo somente o título de saudação e o subtítulo, sem cards de métricas nem grade de módulos.
