
Abaixo está o prompt descritivo do sistema. Está escrito de forma neutra (sem citar nenhuma linguagem, framework, banco ou serviço específico), focando em **o que o sistema faz, para quem, quais regras e quais telas**. Pode ser copiado e usado para briefar outra IA, redesenhar, ou recriar o sistema em qualquer stack.

---

# Prompt — Sistema de Propostas Comparativas de Planos de Saúde

## 1. Visão geral

Construa um sistema web para **corretoras de planos de saúde** que permite a um(a) consultor(a) gerar **propostas comerciais comparativas e personalizadas** para cada cliente, e enviar essas propostas como uma **página pública navegável** (acessível por link único, sem login).

O diferencial do sistema é:

- **Importação automática de PDFs de operadoras** com extração inteligente (IA) de planos, valores, faixas etárias, coberturas e rede credenciada.
- **Cards comparativos lado a lado** de múltiplos planos de várias seguradoras, com personalização visual (cores, destaques) e edição em tempo real direto na página da proposta.
- **Cálculo de mensalidade por idade do beneficiário**, agrupamento de planos com soma de valores (ex.: sócios + funcionários) e exibição de tabelas de faixas etárias e reajustes.
- **Catálogo central** de operadoras, rede credenciada e regras de coparticipação, alimentado por importação de PDFs.

## 2. Perfis de usuário

1. **Administrador / Consultor(a)** — autentica-se no sistema (cadastro livre, sem necessidade de confirmação de e-mail), gerencia propostas, catálogo e configurações.
2. **Cliente final** — não autentica. Recebe um link público (slug aleatório) e visualiza a proposta. Interage apenas com botão de WhatsApp para falar com o consultor.

## 3. Áreas do sistema

### 3.1 Painel de Propostas (Dashboard)

Tela inicial do administrador. Mostra:

- **Cards de estatísticas**: total de propostas, pendentes, enviadas, fechadas.
- **Lista de propostas** com nome do cliente, cidade/estado, tipo de produto, data de criação, badge colorido de status.
- **Filtros**: busca por nome do cliente, filtro por status, ordenação por data (mais recentes/mais antigas).
- **Ações por proposta**: editar, visualizar versão pública, copiar link público, duplicar, marcar como visualizada, excluir.
- **Status possíveis**: pendente, enviada, visualizada, em atendimento, fechada, perdida.
- **Dois fluxos de criação**:
  - **"Criar do zero"** — formulário manual.
  - **"Importar PDF"** — upload de PDFs das operadoras; uma IA extrai automaticamente todos os planos, valores, coberturas, faixas etárias e dados do cliente, gerando os cards comparativos prontos.

### 3.2 Formulário de Proposta (criação/edição)

Permite ao consultor configurar:

**Dados do cliente**: nome, telefone, cidade, estado, tipo de produto (ex.: PME, individual, adesão), perfil/faixa etária, **idades dos beneficiários** (lista separada por vírgula, ex.: `28, 32, 5`), validade da proposta, observações gerais.

**Dados do consultor**: nome, telefone (WhatsApp), foto.

**Múltiplos planos / operadoras**: cada plano possui:

- Nome da operadora e nome do plano (auto-limpeza: remove o nome da operadora repetido no nome do plano).
- Valor mensal.
- Coparticipação (Sim / Não / Parcial). Quando "Sim" ou "Parcial", abre um editor de **detalhes de coparticipação** com itens padrão (Consulta, Exames simples, Exames complexos, Terapias, Pronto-socorro, Internação) e valores customizáveis.
- Acomodação, abrangência, reembolso, resumo de cobertura, resumo de rede credenciada.
- **Faixas etárias** (formato de texto: `0-18: R$250,00 | 19-23: R$310,00 | 59+: R$1.200,00`) — usado para calcular automaticamente o total mensal por beneficiário.
- Previsão de reajuste por mudança de faixa.
- **Destaque comercial** (badge): "Mais Econômico", "Mais Completo", "Recomendado", "Melhor Custo-Benefício".
- **Cor da coluna** (paleta com ~20 cores nomeadas: Navy, Gold, Verde, Rubi, Índigo, Grafite, Teal, Cobre, Violeta, Rosa, Âmbar, Céu, Lima, Fúcsia, Ciano, Vermelho, Amarelo, Verde Claro, Zinco, Preto).
- **Grupo de soma** (texto livre, ex.: "Sócios + Funcionários") — planos com mesmo grupo são consolidados em um único card na visão pública, somando os valores mensais.
- Ordem de exibição.
- **PDF anexo** (a IA pode extrair automaticamente os dados ao fazer upload).

**Ações**:
- Adicionar/remover planos, reordenar via drag-handle.
- Salvar proposta (gera slug aleatório de 10 caracteres para o link público).
- Botão para extrair dados de um PDF específico via IA (preenche os campos automaticamente).

### 3.3 Página Pública da Proposta

Acessada por `/{slug}` sem login. Layout premium e clean (paleta Navy & Gold).

**Cabeçalho**:
- Saudação com nome do cliente.
- Cidade, validade da proposta, tipo de produto.
- Foto, nome e telefone do consultor.

**Tabela comparativa de planos**:
- **Agrupada por seguradora** — cada operadora vira uma **tabela independente**, com cor própria (definida pela paleta).
- Colunas = planos. Linhas = critérios (Valor mensal, Coparticipação, Acomodação, Abrangência, Reembolso, Cobertura, Rede credenciada, Faixas etárias, etc.).
- A primeira coluna ("Planos" / rótulos) usa a cor da seguradora.
- Cards/colunas exibem badge de destaque comercial quando configurado.
- Quando o cliente informou idades dos beneficiários, mostra **valor calculado por idade** (mapeando idade → faixa etária → valor) e o total consolidado.
- Planos com mesmo "grupo de soma" aparecem como **um único card consolidado** com o rótulo do grupo e soma dos valores.
- Linhas podem ser **ocultadas** pelo administrador (campo `linhas_ocultas`).

**Modo de edição inline (apenas para o admin logado)**:
- Botão "Editar" no topo. Permite editar qualquer campo direto na visualização.
- Trocar cor da tabela inteira via picker no cabeçalho da coluna "Planos".
- Adicionar nova seguradora (cria nova tabela).
- Adicionar plano (coluna) dentro de uma tabela existente.
- Remover plano, ocultar/exibir linhas.
- Salvar/Cancelar alterações.

**Detalhes finais**:
- Tabela de **faixas etárias e reajustes** por plano.
- Observações gerais.
- **CTA único e centralizado**: botão grande de WhatsApp que abre conversa com o consultor (mensagem pré-preenchida mencionando o nome do cliente e a proposta). Não há botões de "tenho interesse" por plano — toda conversão é via WhatsApp.

### 3.4 Catálogo (Administração)

Área para o consultor manter a base mestre de informações reutilizáveis em propostas. Abas:

**Operadoras**: cadastro de seguradoras (nome, slug, logo, ativo/inativo, observações).

**Rede Credenciada**: lista de hospitais, clínicas, laboratórios, prontos-socorros etc., vinculados a uma operadora.
- Campos: nome, tipo, endereço completo (CEP, endereço, bairro, cidade, estado), telefone, especialidades, planos aplicáveis, **coberturas por plano** (ex.: `{ "Premium": "H/P.S/M/A", "Efetivo": "H/P.S/M" }`), destaque, ativo.
- **Importação por PDF/Excel**: substitui o cadastro manual em massa. O consultor escolhe a operadora e faz upload de um PDF/planilha da rede; a IA identifica colunas de planos, siglas de cobertura (H = Hospital, P.S = Pronto-Socorro, M = Maternidade, A = Ambulatorial, HDIA = Hospital-Dia) e popula tudo automaticamente, mostrando preview antes de confirmar.
- Filtros: busca por nome/cidade, filtro por operadora e por plano.

**Coparticipação**: cadastro de modalidades de coparticipação por operadora/plano, com itens (consulta, exames, etc.), valores e observações.

### 3.5 Enriquecimento por localização (rede credenciada)

Quando uma proposta tem cidade do cliente preenchida, a IA pode filtrar e exibir os **5 hospitais/laboratórios mais próximos** do cliente para cada plano, em vez de listar a rede inteira.

## 4. Regras de negócio importantes

1. **Cálculo de mensalidade por faixa etária**: para cada beneficiário, encontra-se a faixa em que a idade se enquadra (`min ≤ idade ≤ max`). Faixas usam o formato `min-max` ou `min+` (aberta, ex.: `59+` significa 59 a 99). Valores em moeda brasileira (BRL), aceita formatos `1.021,63` e `1.021.63`. Total = soma dos valores das faixas correspondentes.

2. **Agrupamento por seguradora**: na visão pública, planos são automaticamente agrupados pelo nome da operadora em tabelas separadas, preservando a ordem da primeira ocorrência.

3. **Grupo de soma**: planos com o mesmo valor (case-insensitive, trimmed) no campo "grupo_soma" são consolidados em um único card virtual cujo valor mensal é a soma dos membros. Útil para cenários como "Plano Sócios + Plano Funcionários" cobrados juntos.

4. **Slug público**: cada proposta recebe um identificador aleatório de 10 caracteres alfanuméricos para o link público (não sequencial, não adivinhável).

5. **Status da proposta**: muda manualmente pelo admin OU automaticamente quando o cliente abre o link público (passa para "visualizada").

6. **Limpeza de nome de plano**: se o nome do plano começa com o nome da operadora (ex.: "Bradesco Saúde Efetivo"), o sistema remove automaticamente o prefixo redundante para exibir apenas "Efetivo".

7. **Destaque comercial**: cada plano pode ter no máximo um destaque visual (badge colorido), exibido em cima do card.

## 5. Identidade visual

- Estilo **premium, clean, sofisticado** — semelhante a apresentações financeiras corporativas.
- Paleta principal: **Navy (azul-marinho profundo) + Gold (dourado)**, com paleta secundária ampla disponível para personalização por tabela.
- Tipografia legível, hierarquia clara, muito espaço em branco.
- Tema claro/escuro toggle.
- Layout responsivo: tabelas em desktop, cards empilhados em mobile.

## 6. Permissões e segurança

- Cadastro de admin é livre (qualquer e-mail) e auto-confirmado (sem etapa de confirmação por e-mail), para acesso imediato ao painel.
- Roles armazenados em tabela separada (`user_roles`) — nunca no perfil — para evitar escalonamento de privilégios.
- Páginas públicas de proposta são acessíveis por qualquer pessoa com o link, sem autenticação.
- Apenas o admin dono da proposta pode editá-la / excluí-la.
- Edge functions (IA, importação) validam entrada e tratam arquivos grandes (PDFs com centenas de páginas) em chunks.

## 7. Integrações externas

- **IA generativa multimodal** para extrair dados estruturados de PDFs (planos, valores, coberturas, dados do cliente) e de planilhas Excel da rede credenciada. Recomenda-se modelo com suporte a contexto longo e visão (PDF + texto).
- **WhatsApp** via deep link `https://wa.me/{telefone}?text={mensagem-pré-preenchida}` para conversão.
- **Storage público** para guardar PDFs originais das operadoras e fotos dos consultores.

## 8. Modelo de dados (conceitual)

- **Propostas**: cliente, consultor, status, slug público, idades de beneficiários, linhas ocultas, cores dos rótulos.
- **Planos da proposta** (1:N com Propostas): operadora, plano, valor, coparticipação + detalhes, acomodação, abrangência, reembolso, cobertura, rede, faixas etárias, reajustes, destaque, cor, grupo de soma, ordem.
- **Catálogo de Operadoras**: dados mestres de seguradoras.
- **Catálogo de Rede Credenciada**: hospitais/clínicas com coberturas por plano.
- **Catálogo de Coparticipação**: modalidades padronizadas por operadora.
- **Uploads de Rede**: histórico de importações de PDFs/Excel da rede.
- **Roles de usuário**: tabela separada para controle de acesso.

## 9. Resultado esperado

Ao final, um corretor deve conseguir, em poucos minutos:
1. Subir 3 PDFs de operadoras → ter uma proposta comparativa pronta com cards lado a lado.
2. Ajustar cores, ocultar linhas irrelevantes, marcar o plano "Recomendado".
3. Informar as idades dos beneficiários e ver o valor total calculado automaticamente.
4. Copiar o link público e enviar pelo WhatsApp para o cliente.
5. Acompanhar pelo dashboard quando o cliente abrir a proposta e mover o status até "Fechada".

---

Posso, depois da sua aprovação, salvar este prompt em um arquivo do projeto (ex.: `docs/system-prompt.md`) para ficar versionado, ou apenas devolver o texto na resposta. Me diz qual prefere.
