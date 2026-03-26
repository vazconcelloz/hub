

## Plano: Extração automática de dados do PDF da operadora via IA

### Problema
Hoje a consultora precisa preencher manualmente todos os campos de cada operadora (nome, plano, valor, coparticipação, etc.). O objetivo é que, ao fazer upload do PDF, os campos sejam preenchidos automaticamente usando IA.

### Como vai funcionar

1. **Fluxo do usuário**: A consultora faz upload do PDF da operadora → aparece um botão "Extrair dados do PDF" com indicador de loading → os campos são preenchidos automaticamente → ela pode revisar e ajustar antes de salvar.

2. **Edge Function `extract-pdf-data`**: Recebe o PDF como base64, envia para o Lovable AI (Gemini) com um prompt estruturado pedindo para extrair os campos da operadora. Usa tool calling para garantir resposta JSON estruturada com os campos: `operadora_nome`, `plano_nome`, `valor_mensal`, `coparticipacao`, `acomodacao`, `abrangencia`, `reembolso`, `resumo_cobertura`, `rede_credenciada_resumo`.

3. **Frontend (`PropostaFormPage.tsx`)**: Ao selecionar um PDF, além de guardar o arquivo, dispara a extração. Mostra estado de "Extraindo dados..." no card da operadora. Quando os dados chegam, preenche os campos automaticamente. A consultora pode editar qualquer campo antes de salvar.

### Arquivos a criar/modificar

| Arquivo | Ação |
|---------|------|
| `supabase/functions/extract-pdf-data/index.ts` | Criar edge function que recebe PDF e retorna dados extraídos via Lovable AI |
| `src/pages/PropostaFormPage.tsx` | Modificar upload de PDF para disparar extração e preencher campos |

### Detalhes técnicos

- O PDF é convertido para base64 no frontend e enviado à edge function
- A edge function usa o modelo `google/gemini-2.5-flash` (bom com documentos, rápido e econômico)
- Usa tool calling para structured output confiável
- O `LOVABLE_API_KEY` já está configurado como secret
- Campos que a IA não conseguir extrair ficam vazios para preenchimento manual
- O destaque comercial não é extraído (é decisão da consultora)

