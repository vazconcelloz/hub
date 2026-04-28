# Importação da Rede Credenciada via PDF/Excel

Em vez de cadastrar hospital por hospital manualmente, vamos permitir upload de um arquivo (PDF ou Excel) por operadora. A IA lê o arquivo, identifica as colunas de planos e as siglas de cobertura (H, P.S, M, A, HDIA) e popula o catálogo automaticamente.

## Como vai funcionar (visão do usuário)

1. Na aba **Rede Credenciada** do Catálogo, em vez do botão "Novo", aparece **"Importar PDF/Excel"**.
2. Seleciona a operadora (ex: Bradesco) → faz upload do arquivo (igual ao `Rede_Hospitalar_-_Bradesco.pdf`).
3. A IA processa e mostra um **preview** com:
   - Planos detectados (Efetivo, Efetivo Plus, Flex, Ideal, Nacional II, Nacional III, Nacional Plus, Premium...)
   - Total de hospitais encontrados (ex: "428 hospitais em 187 cidades")
   - Amostra das primeiras linhas para confirmar
4. Usuário confirma → salva tudo no banco.
5. A lista fica navegável com filtro por **cidade** e **plano**, pois a rede de cada plano é diferente.

## Mudanças no banco

A tabela `rede_credenciada_catalogo` já tem `planos_aplicaveis` (array). Vamos:

- Adicionar coluna `coberturas_por_plano` (jsonb) — armazena `{ "Efetivo": "H/P.S/M", "Premium": "H/P.S/M/A" }` por hospital, preservando as siglas.
- Criar tabela `rede_credenciada_uploads` para guardar histórico dos uploads (operadora, arquivo, data, total importado, status) — permite re-processar ou substituir.
- Criar bucket de storage `rede-credenciada-pdfs` (público) para guardar os arquivos originais.

## Mudanças na Edge Function

Nova edge function `import-rede-credenciada`:
- Recebe `operadora_id` + URL do arquivo no storage.
- Se PDF → extrai texto com Gemini (igual ao `extract-pdf-data` já existente).
- Se Excel (.xlsx) → converte para texto/CSV e envia ao Gemini.
- Prompt instrui o Gemini a retornar JSON estruturado: `[{ cidade, nome, tipo, coberturas_por_plano: {...} }]`.
- Faz upsert em massa em `rede_credenciada_catalogo` (substitui o que já existe daquela operadora).

## Mudanças na UI

`src/pages/CatalogoPage.tsx`:
- Substituir botão "Novo" da aba Rede por **"Importar arquivo"** (mantém edição manual de itens existentes).
- Novo dialog `ImportarRedeDialog` com:
  - Select de operadora
  - Input de arquivo (.pdf, .xlsx, .xls)
  - Barra de progresso durante processamento
  - Tela de preview com tabela paginada antes de confirmar
- Lista da rede ganha filtros: busca por nome/cidade + select de plano.
- Cada linha mostra as coberturas em badges coloridos por plano.

## Detalhes técnicos

- **Bucket**: `rede-credenciada-pdfs`, público, RLS permitindo `anon` upload (sistema sem login).
- **Migration**: `ALTER TABLE rede_credenciada_catalogo ADD COLUMN coberturas_por_plano jsonb DEFAULT '{}'::jsonb;` + criar `rede_credenciada_uploads` + criar bucket.
- **Gemini**: usar `google/gemini-2.5-pro` (PDFs grandes, contexto extenso — esse Bradesco tem 642 linhas).
- **Excel**: usar lib `xlsx` (SheetJS) na edge function para converter para CSV antes de enviar ao Gemini.
- **Performance**: processar em chunks se PDF tiver mais de ~50 páginas; salvar em batches de 200 linhas.

## O que NÃO muda

- Aba Operadoras e aba Coparticipação ficam iguais.
- Edição/exclusão manual individual de itens da rede continua funcionando (para ajustes pontuais após importação).

Posso prosseguir com a implementação?