

## Plano: Extrair dados do cliente (nome, cidade, estado) do PDF

### O que muda

Quando a IA extrair dados do PDF da operadora, além dos campos da operadora, ela também tentará identificar dados do cliente (nome, cidade, estado) que frequentemente aparecem nos documentos de cotação. Se encontrados e os campos do formulário estiverem vazios, serão preenchidos automaticamente.

### Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/extract-pdf-data/index.ts` | Adicionar 3 campos ao schema do tool calling: `cliente_nome`, `cliente_cidade`, `cliente_estado` |
| `src/pages/PropostaFormPage.tsx` | Após receber os dados extraídos, preencher `nome_cliente`, `cidade` e `estado` no formulário (apenas se estiverem vazios) |

### Detalhes técnicos

- Na edge function, os novos campos são opcionais no schema (não estão em `required`)
- O prompt do sistema já é genérico o suficiente; basta adicionar os campos com descrições claras
- No frontend, os dados do cliente só preenchem campos vazios para não sobrescrever dados já digitados pela consultora
- Se o PDF não contiver dados do cliente, os campos simplesmente continuam vazios

