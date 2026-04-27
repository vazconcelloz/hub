## Edição inline na tela de visualização (somente admin logado)

Hoje a página `/cotacao/:slug` (`PublicPropostaPage.tsx`) é pública — qualquer pessoa com o link vê a proposta, e ninguém edita por ali. A edição só acontece em `/admin/proposta/:id`.

A ideia é: quando **o próprio corretor (logado no portal)** abrir o link da cotação, ele possa editar os campos diretamente na tela de visualização, sem precisar ir até o formulário separado. Para o cliente (não logado), nada muda.

### Como vai funcionar

1. **Detecção de admin na própria página pública**
   - `PublicPropostaPage` passa a usar o `useAuth()` para saber se há um usuário logado.
   - Além de logado, esse usuário precisa ser o **dono da proposta** (`proposta.user_id === user.id`). Só nesse caso o "modo edição" fica disponível.
   - O cliente acessando pelo link continua vendo exatamente a mesma página de hoje (read-only).

2. **Botão "Editar" no topo (só para o dono)**
   - Aparece uma barra/flutuante no topo com:
     - Botão **Editar** → entra em modo de edição inline.
     - Em modo edição: botões **Salvar** e **Cancelar**.
     - Link **Abrir editor completo** → leva para `/admin/proposta/:id` (caso prefira o formulário cheio).

3. **Campos editáveis inline**
   - **Dados do cliente / proposta** (cabeçalho): `nome_cliente`, `cidade`, `estado`, `tipo_produto`, `validade_proposta`.
   - **Por operadora** (na tabela comparativa e nos cards mobile): `operadora_nome`, `plano_nome`, `valor_mensal`, `coparticipacao` (Sim/Não), `acomodacao`, `abrangencia`, `reembolso`, `resumo_cobertura`, `rede_credenciada_resumo`, `destaque_comercial`.
   - Cada célula vira um input/select/textarea quando o modo edição está ativo. Visual de leitura mantém-se idêntico fora do modo edição.

4. **Salvamento**
   - "Salvar" dispara um update único:
     - `update` em `propostas` (campos do cabeçalho).
     - `update` em cada linha alterada de `proposta_operadoras`.
   - As policies RLS atuais já permitem isso: `Users can update their own propostas` e `Users can update operadoras` validam `auth.uid() = user_id`. Ou seja, mesmo que um curioso tente forçar um update sem ser o dono, o banco bloqueia. Não precisa de migração.
   - Após salvar: toast de sucesso e recarrega os dados.

5. **Cancelar**
   - Restaura o estado original (snapshot feito ao entrar em modo edição) e sai do modo edição.

### Segurança

- Verificação visual no front (mostrar/ocultar botão) **+** verificação real no banco via RLS.
- Cliente sem sessão nunca vê os controles e, mesmo que tente chamar o update manualmente, o RLS bloqueia.
- Nada muda nas policies — as existentes já cobrem o caso.

### Arquivos afetados

- `src/pages/PublicPropostaPage.tsx` — única alteração de código. Adiciona:
  - `useAuth()` + flag `canEdit`.
  - Estado `editMode`, `draftProposta`, `draftOperadoras`.
  - Componentes inline (input/select/textarea) condicionais nos lugares onde hoje é só texto.
  - Handlers `handleSave`, `handleCancel`, `handleEdit`.
  - Barra superior com botões.

### Fora do escopo (para manter o passo enxuto)

- Adicionar/remover operadoras inline (continua só pelo `/admin/proposta/:id`).
- Editar PDF, faixas etárias e foto da consultora inline (continua no formulário completo).
- Edição inline das idades dos beneficiários (continua no formulário).

Esses casos seguem disponíveis pelo botão "Abrir editor completo".