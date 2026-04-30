# Prompt Completo — Sistema de Propostas Comparativas de Planos de Saúde

> Use este documento como **briefing único** para recriar o sistema do zero em qualquer stack. Ele descreve **tudo**: propósito, perfis, telas, fluxos, regras de negócio, modelo de dados, identidade visual, integrações, segurança e critérios de aceitação. Não menciona linguagem, framework, banco ou serviço específico — implemente com a stack de sua preferência.

---

## 1. Propósito do produto

Sistema web para **corretoras de planos de saúde** que permite a um(a) consultor(a) **gerar, gerenciar e enviar propostas comerciais comparativas e personalizadas** para clientes finais.

A proposta final é uma **página pública navegável** (acessível por link único, sem login) com cards/tabelas comparativas lado a lado, valores calculados pela idade dos beneficiários e um único CTA central via WhatsApp.

O sistema também mantém um **catálogo central** de operadoras, rede credenciada e regras de coparticipação, alimentado por importação automática de PDFs e planilhas com auxílio de IA.

### Diferenciais

- Importação automática de **PDFs de operadoras** com extração inteligente de planos, valores, faixas etárias, coberturas e rede credenciada.
- **Edição inline** da proposta direto na página pública (modo admin), incluindo cores, ocultar linhas, adicionar/remover planos e seguradoras.
- **Cálculo automático** de mensalidade por idade do beneficiário e **agrupamento de planos com soma de valores** (ex.: sócios + funcionários consolidados em um único card).
- **Filtragem geográfica** da rede credenciada pelos 5 estabelecimentos mais próximos da cidade do cliente.

---

## 2. Perfis de usuário

| Perfil | Acesso | Pode |
|--------|--------|------|
| **Administrador / Consultor(a)** | Autentica-se (cadastro livre por e-mail/senha, **auto-confirmado**, sem etapa de verificação por e-mail) | Gerenciar propostas, catálogo, configurações; editar a página pública em modo inline |
| **Cliente final** | Não autentica | Visualizar a proposta pelo link público, interagir apenas pelo botão de WhatsApp |

Roles devem ser armazenadas em **tabela separada** (`user_roles`) e nunca no perfil do usuário, para evitar escalonamento de privilégios.

---

## 3. Mapa de telas

```
/                       → redireciona para /admin
/admin                  → Dashboard de propostas (privado)
/admin/proposta/:id     → Formulário de criação/edição de proposta (privado)
/admin/catalogo         → Catálogo (Operadoras / Rede / Coparticipação) (privado)
/cotacao/:slug          → Página pública da proposta (sem login)
/admin/cotacao/:slug    → Mesma página, com modo de edição inline ativo
```

---

## 4. Telas em detalhe

### 4.1 Dashboard de Propostas (`/admin`)

**Cabeçalho**: logo, navegação (Propostas, Catálogo), toggle tema claro/escuro, sair.

**Conteúdo**:
- **Cards de estatísticas** no topo: total de propostas, pendentes, enviadas, fechadas.
- **Barra de ações**: busca por nome do cliente, filtro por status, ordenação (mais recentes / mais antigas), botão **"Criar do zero"** e botão **"Importar PDF"**.
- **Lista de propostas** (cards ou tabela): nome do cliente, cidade/estado, tipo de produto, data de criação, badge colorido de status.
- **Ações por proposta**: editar, visualizar versão pública, copiar link público, duplicar, marcar como visualizada, alterar status, excluir.

**Status possíveis**: `pendente`, `enviada`, `visualizada`, `em_atendimento`, `fechada`, `perdida`.

**Fluxos de criação**:
1. **Criar do zero** → abre formulário em branco.
2. **Importar PDF** → upload de 1+ PDFs de operadoras → IA extrai todos os planos, valores, coberturas, faixas etárias e (quando disponível) os dados do cliente → abre o formulário já preenchido.

### 4.2 Formulário de Proposta (`/admin/proposta/:id`)

Dividido em seções colapsáveis:

#### Dados do cliente
- Nome, telefone, cidade, estado, tipo de produto (PME, individual, adesão...), perfil/faixa etária.
- **Idades dos beneficiários** (lista separada por vírgula, ex.: `28, 32, 5`) — usada no cálculo automático.
- Validade da proposta, observações gerais.

#### Dados do consultor
- Nome, telefone (WhatsApp), foto (upload).

#### Planos / Operadoras (lista dinâmica, 1:N)
Cada plano contém:
- **Operadora** e **nome do plano** (auto-limpeza: se o nome do plano começa com o nome da operadora, o prefixo redundante é removido).
- **Valor mensal**.
- **Coparticipação**: `Sim` / `Não` / `Parcial`. Quando `Sim` ou `Parcial`, abre editor de **detalhes** com itens padrão (Consulta, Exames simples, Exames complexos, Terapias, Pronto-socorro, Internação) e valores customizáveis por item.
- **Acomodação** (Enfermaria / Apartamento), **abrangência** (Municipal / Estadual / Nacional / Internacional), **reembolso**, **resumo de cobertura**, **resumo de rede credenciada**.
- **Faixas etárias** em texto estruturado: `0-18: R$250,00 | 19-23: R$310,00 | 59+: R$1.200,00`.
- **Previsão de reajuste** por mudança de faixa.
- **Destaque comercial** (badge): `Mais Econômico`, `Mais Completo`, `Recomendado`, `Melhor Custo-Benefício`, ou nenhum.
- **Cor da coluna** (paleta nomeada de ~20 cores): Navy, Gold, Verde, Rubi, Índigo, Grafite, Teal, Cobre, Violeta, Rosa, Âmbar, Céu, Lima, Fúcsia, Ciano, Vermelho, Amarelo, Verde Claro, Zinco, Preto.
- **Grupo de soma** (texto livre): planos com mesmo valor são consolidados em um card único na visão pública (ex.: "Sócios + Funcionários").
- **Ordem de exibição**.
- **PDF anexo** com botão "Extrair com IA" que preenche os campos automaticamente.

**Ações da seção**: adicionar plano, remover plano, reordenar via drag-handle.

**Ações globais do formulário**: Salvar (gera/atualiza `slug` aleatório de 10 caracteres alfanuméricos), Cancelar, Pré-visualizar pública, Copiar link.

### 4.3 Página Pública da Proposta (`/cotacao/:slug`)

Layout premium e clean (paleta Navy & Gold). Sem autenticação.

**Cabeçalho**:
- Saudação personalizada com nome do cliente.
- Cidade, validade da proposta, tipo de produto.
- Card do consultor: foto, nome, telefone.

**Tabelas comparativas**:
- Planos são **agrupados automaticamente por seguradora** — cada operadora vira uma **tabela independente**, com cor própria.
- **Colunas** = planos. **Linhas** = critérios (Valor mensal, Coparticipação, Acomodação, Abrangência, Reembolso, Cobertura, Rede credenciada, Faixas etárias, Reajuste...).
- A primeira coluna ("Planos" / rótulos) usa a cor da seguradora.
- Cards exibem **badge de destaque comercial** quando configurado.
- Quando há idades de beneficiários, a linha de valor mostra **valor calculado por idade** (mapeando idade → faixa → valor) e **total consolidado**.
- Planos com mesmo `grupo_soma` aparecem como **um único card consolidado** com o rótulo do grupo e valor = soma dos membros.
- Linhas podem ser **ocultadas** pelo administrador (campo `linhas_ocultas`).

**Modo de edição inline** (apenas para admin autenticado, na rota `/admin/cotacao/:slug`):
- Botão "Editar" no topo. Permite editar qualquer campo direto na visualização.
- Trocar **cor da tabela inteira** via picker no cabeçalho da coluna "Planos" (somente nesta célula).
- Botão **"Adicionar seguradora"** (cria nova tabela).
- Botão **"Adicionar plano"** dentro de uma tabela existente (nova coluna).
- Remover plano, ocultar/exibir linhas.
- Salvar / Cancelar alterações.

**Detalhes finais**:
- Tabela de **faixas etárias e reajustes** por plano.
- Observações gerais.
- **CTA único e centralizado**: botão grande de WhatsApp que abre conversa com o consultor com mensagem pré-preenchida (`https://wa.me/{telefone}?text=...` mencionando nome do cliente e proposta).
- **Não há botões "tenho interesse" por plano** — toda conversão acontece via WhatsApp.

### 4.4 Catálogo (`/admin/catalogo`)

Três abas:

#### Aba Operadoras
CRUD de seguradoras: nome, slug, logo (upload), ativo/inativo, observações.

#### Aba Rede Credenciada
Lista mestre de hospitais, clínicas, laboratórios, prontos-socorros, vinculados a uma operadora.
- Campos: nome, tipo, endereço completo (CEP, rua, bairro, cidade, estado), latitude/longitude, telefone, especialidades, planos aplicáveis, **coberturas por plano** (ex.: `{ "Premium": "H/P.S/M/A", "Efetivo": "H/P.S/M" }`), destaque, ativo.
- **Importação por PDF/Excel** (substitui o cadastro manual em massa):
  1. Selecionar operadora.
  2. Upload do arquivo (PDF ou .xlsx/.xls).
  3. IA identifica colunas de planos, siglas de cobertura (`H` = Hospital, `P.S` = Pronto-Socorro, `M` = Maternidade, `A` = Ambulatorial, `HDIA` = Hospital-Dia) e popula tudo.
  4. **Preview paginado** antes de confirmar (planos detectados, total de hospitais, amostra de linhas).
  5. Confirmar → upsert em massa, substituindo o cadastro daquela operadora.
- Filtros da listagem: busca por nome/cidade, select de operadora, select de plano.
- Cada linha mostra coberturas em badges coloridos por plano.
- Edição manual individual continua disponível para ajustes pontuais.
- Histórico de uploads em tabela separada (`rede_credenciada_uploads`).

#### Aba Coparticipação
Cadastro de modalidades por operadora/plano: itens, valores, observações, ativo.

### 4.5 Enriquecimento por localização (rede credenciada)

Quando uma proposta tem **cidade do cliente** preenchida, a IA filtra e exibe somente os **5 estabelecimentos mais próximos** do cliente para cada plano (usando latitude/longitude do catálogo), em vez de listar a rede inteira.

---

## 5. Regras de negócio

1. **Cálculo de mensalidade por faixa etária**
   - Para cada beneficiário, encontrar a faixa em que a idade se enquadra: `min ≤ idade ≤ max`.
   - Faixas usam formato `min-max` ou `min+` (aberta, ex.: `59+` significa 59 a 99).
   - Valores em **moeda brasileira (BRL)**, aceita formatos `1.021,63` e `1.021.63`.
   - **Total mensal = soma** dos valores das faixas correspondentes a todos os beneficiários.

2. **Agrupamento por seguradora**
   - Na visão pública, planos são agrupados pelo nome da operadora em tabelas separadas, preservando a ordem da primeira ocorrência.

3. **Grupo de soma**
   - Planos com mesmo valor (case-insensitive, trimmed) no campo `grupo_soma` são consolidados em **um único card virtual** cujo valor mensal é a **soma** dos membros.
   - O nome exibido é o valor do `grupo_soma`.

4. **Slug público**
   - Cada proposta recebe um identificador aleatório de 10 caracteres alfanuméricos (não sequencial, não adivinhável).

5. **Status automático**
   - Muda manualmente pelo admin OU **automaticamente** para `visualizada` quando o cliente abre o link público pela primeira vez.

6. **Limpeza de nome de plano**
   - Se o nome do plano começa com o nome da operadora (ex.: "Bradesco Saúde Efetivo"), o sistema remove automaticamente o prefixo para exibir apenas "Efetivo".

7. **Destaque comercial**
   - No máximo um destaque por plano, exibido como badge colorido sobre o card.

8. **Coparticipação**
   - Quando `Sim` ou `Parcial`, o detalhamento por item é obrigatório para aparecer na visão pública.

9. **Edição inline**
   - Apenas o admin autenticado dono da proposta pode usar o modo edição na página pública.
   - Trocar cor da coluna só está disponível na célula de "Planos" (rótulos) — demais células não têm color picker.

---

## 6. Modelo de dados (conceitual)

### `propostas`
`id`, `user_id` (dono), `nome_cliente`, `telefone_cliente`, `cidade`, `estado`, `tipo_produto`, `faixa_etaria_ou_perfil`, `idades_beneficiarios` (texto CSV), `consultora_nome`, `consultora_telefone`, `consultora_foto_url`, `validade_proposta` (date), `observacoes_gerais`, `status`, `slug` (único, 10 chars), `linhas_ocultas` (array de strings), `cores_rotulos` (jsonb), `created_at`, `updated_at`.

### `proposta_operadoras` (1:N de `propostas`)
`id`, `proposta_id`, `operadora_nome`, `plano_nome`, `valor_mensal`, `coparticipacao` (`Sim`/`Não`/`Parcial`), `coparticipacao_detalhes` (jsonb: `[{item, valor, observacao}]`), `acomodacao`, `abrangencia`, `reembolso`, `resumo_cobertura`, `rede_credenciada_resumo`, `faixas_etarias` (texto), `previsao_reajuste_faixa`, `destaque_comercial`, `cor_coluna`, `cores_celulas` (jsonb), `grupo_soma`, `ordem_exibicao`, `pdf_url`, `created_at`, `updated_at`.

### `operadoras_catalogo`
`id`, `nome`, `slug`, `logo_url`, `ativo`, `observacoes`, timestamps.

### `rede_credenciada_catalogo`
`id`, `operadora_id`, `nome`, `tipo`, `cep`, `endereco`, `bairro`, `cidade`, `estado`, `latitude`, `longitude`, `telefone`, `especialidades` (array), `planos_aplicaveis` (array), `coberturas_por_plano` (jsonb), `destaque`, `ativo`, timestamps.

### `rede_credenciada_uploads`
`id`, `operadora_id`, `arquivo_nome`, `arquivo_url`, `planos_detectados` (array), `total_importado`, `status`, `observacoes`, `created_at`.

### `coparticipacao_catalogo`
`id`, `operadora_id`, `plano_nome`, `modalidade`, `itens` (jsonb), `observacoes`, `ativo`, timestamps.

### `user_roles`
`id`, `user_id`, `role` (enum: `admin`, `user`), `created_at`. **Tabela separada obrigatoriamente.**

---

## 7. Identidade visual

- Estilo **premium, clean, sofisticado** — semelhante a apresentações financeiras corporativas.
- Paleta principal: **Navy** (azul-marinho profundo) + **Gold** (dourado).
- Paleta secundária ampla (~20 cores nomeadas) disponível para personalização por tabela na proposta pública.
- Tipografia legível, hierarquia clara, muito espaço em branco.
- **Tema claro/escuro** com toggle persistido.
- Layout **responsivo**: tabelas em desktop, cards empilhados em mobile.
- Todas as cores devem usar tokens semânticos (não hardcoded em componentes), para suportar trocas de tema.

---

## 8. Integrações externas

1. **IA generativa multimodal** — para:
   - Extrair planos/valores/coberturas/dados do cliente de PDFs de operadoras.
   - Extrair rede credenciada de PDFs ou planilhas Excel.
   - Filtrar os 5 estabelecimentos mais próximos da cidade do cliente.
   - Recomenda-se modelo com **contexto longo + visão** (PDFs com centenas de páginas).
2. **WhatsApp** — via deep link `https://wa.me/{telefone}?text={mensagem}` com mensagem pré-preenchida.
3. **Storage público** — para PDFs originais das operadoras, planilhas de rede e fotos dos consultores. Buckets sugeridos: `propostas-pdfs`, `rede-credenciada-pdfs`, `consultores-fotos`.

---

## 9. Segurança e permissões

- Autenticação por e-mail/senha. **Cadastro livre e auto-confirmado** (sem etapa de confirmação por e-mail) para acesso imediato.
- Roles em **tabela separada** (`user_roles`); função `has_role(user_id, role)` com `SECURITY DEFINER` para uso em policies sem recursão.
- **Páginas públicas de proposta** acessíveis a qualquer pessoa com o link, sem autenticação (policy `SELECT` para anônimos).
- Apenas o admin **dono da proposta** pode editar/excluir (policy baseada em `user_id`).
- Funções server-side de IA/importação validam entrada, limitam tamanho de arquivo e processam PDFs grandes em chunks.
- **Nunca** armazenar credenciais ou chaves de API no cliente.

---

## 10. Fluxos principais (end-to-end)

### Fluxo A — Criar proposta importando PDFs
1. Admin entra em `/admin` → clica **"Importar PDF"**.
2. Sobe 1+ PDFs de operadoras.
3. IA processa e devolve estrutura completa (planos, valores, coberturas, faixas, dados do cliente quando presentes).
4. Admin é levado ao formulário já preenchido → ajusta detalhes → salva.
5. Sistema gera `slug` e exibe link público.

### Fluxo B — Criar proposta manual
1. Admin entra em `/admin` → **"Criar do zero"**.
2. Preenche cliente, consultor, adiciona planos um a um.
3. Salva → recebe link público.

### Fluxo C — Personalizar proposta na visão pública (modo admin)
1. Admin abre `/admin/cotacao/:slug`.
2. Ativa modo "Editar".
3. Ajusta cor da tabela, oculta linhas, marca destaque, adiciona seguradora ou plano.
4. Salva.

### Fluxo D — Cliente recebe e responde
1. Admin copia link e envia ao cliente pelo WhatsApp.
2. Cliente abre `/cotacao/:slug` → status muda automaticamente para `visualizada`.
3. Cliente clica no botão WhatsApp central → abre conversa com o consultor.
4. Admin acompanha pelo dashboard e atualiza status até `fechada` ou `perdida`.

### Fluxo E — Importar rede credenciada
1. Admin entra em **Catálogo → Rede Credenciada**.
2. Clica **"Importar arquivo"** → seleciona operadora → upload PDF/Excel.
3. IA processa → mostra preview (planos, total, amostra).
4. Admin confirma → upsert em massa, substituindo cadastro anterior daquela operadora.
5. Upload registrado em `rede_credenciada_uploads`.

---

## 11. Critérios de aceitação

Um corretor deve conseguir, **em poucos minutos**:
1. Subir 3 PDFs de operadoras → ter uma proposta comparativa pronta com cards lado a lado.
2. Ajustar cores das tabelas, ocultar linhas irrelevantes, marcar o plano "Recomendado".
3. Informar idades dos beneficiários e ver o total mensal calculado automaticamente, com soma de planos do mesmo `grupo_soma`.
4. Copiar o link público e enviar pelo WhatsApp para o cliente.
5. Acompanhar pelo dashboard quando o cliente abrir a proposta e mover o status até "Fechada".
6. Importar a rede credenciada de uma operadora a partir de um único PDF e ver os hospitais filtrados pela cidade do cliente na proposta pública.

---

## 12. Glossário

- **Proposta**: documento comercial gerado pelo consultor, com 1+ planos, dirigido a um cliente específico.
- **Plano**: oferta de uma operadora (linha de produto) com valor, coberturas e faixas etárias próprias.
- **Operadora / Seguradora**: empresa que oferece planos (ex.: Bradesco, SulAmérica, Amil).
- **Faixa etária**: intervalo de idades com valor mensal específico definido pela operadora.
- **Grupo de soma**: rótulo que agrupa planos cujos valores devem ser apresentados como um total único (ex.: sócios + funcionários).
- **Slug**: identificador curto e aleatório usado na URL pública da proposta.
- **Cobertura (siglas)**: `H` Hospital, `P.S` Pronto-Socorro, `M` Maternidade, `A` Ambulatorial, `HDIA` Hospital-Dia.
- **Modo inline**: edição da proposta diretamente sobre a página pública, disponível apenas para o admin autenticado.
