

## Plano: Buscar melhores hospitais próximos à cidade do cliente

### O que muda

Ao extrair dados do PDF, o campo `rede_credenciada_resumo` será enriquecido com uma busca inteligente: a IA receberá a cidade/estado do cliente como contexto e será instruída a priorizar os melhores hospitais e laboratórios mais próximos daquela região ao descrever a rede credenciada.

### Abordagem

Em vez de criar uma chamada separada, vamos passar a cidade e estado do cliente como contexto adicional no prompt da edge function `extract-pdf-data`. Assim a IA, ao interpretar o PDF, já foca nos hospitais/clínicas mais relevantes para aquela localidade.

Além disso, adicionaremos um segundo passo: após a extração do PDF, se o campo `rede_credenciada_resumo` veio vazio ou genérico, uma segunda chamada à IA enriquece esse campo usando o nome da operadora + cidade para listar os principais hospitais da rede naquela região.

### Arquivos a modificar

| Arquivo | Mudança |
|---------|---------|
| `supabase/functions/extract-pdf-data/index.ts` | Receber `cidade` e `estado` como parâmetros opcionais; incluir no prompt para a IA priorizar hospitais próximos; adicionar segunda chamada de enriquecimento se rede credenciada ficou vazia |
| `src/pages/PropostaFormPage.tsx` | Enviar `cidade` e `estado` atuais do formulário junto com o PDF na chamada à edge function |

### Detalhes técnicos

**Edge function** — alterações no `extract-pdf-data`:
- Aceitar `{ pdf_base64, cidade?, estado? }` no body
- Incluir no prompt do sistema: "O cliente está localizado em {cidade}/{estado}. Ao descrever a rede credenciada, priorize os melhores hospitais, laboratórios e clínicas mais próximos dessa região."
- Após a extração principal, se `rede_credenciada_resumo` estiver vazio/curto, fazer uma segunda chamada pedindo: "Liste os 5 principais hospitais e laboratórios da rede {operadora_nome} na região de {cidade}/{estado}"
- Retornar o campo enriquecido junto com os demais dados

**Frontend** — alteração no `PropostaFormPage.tsx`:
- Na chamada `supabase.functions.invoke("extract-pdf-data", ...)`, incluir `cidade: form.cidade, estado: form.estado` no body
- Se a cidade for preenchida pela própria extração do PDF (campo vazio antes), usar esse valor para o enriquecimento na mesma chamada

