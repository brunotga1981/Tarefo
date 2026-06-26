# Tarefo

Sistema de **gestão de tarefas e comunicação interna** da **Azul Administradora — Smart Living**.

> 📄 O entendimento completo do projeto está em [`MINUTA_ENTENDIMENTO.md`](./MINUTA_ENTENDIMENTO.md).

## Status

**Fase 4 — Torpedo (Comunicação interna)** (concluída): mensageria estilo Slack com
**conversas 1‑a‑1**, **grupos** e **canais por cliente** (o canal do cliente é o **R.A.C —
Relatório de Acompanhamento de Cliente**, reunindo as tarefas do cliente junto das conversas).
Recursos do chat: **status de presença** (Disponível/Ocupado/Em Reunião/Indisponível),
**reações** com emoji, **anexos**, **emojis e formatação** (**negrito**/*itálico*),
**encaminhar/compartilhar** mensagens (inclusive via “/”), **TMR** (tempo médio de resposta),
**Finalizar Conversa** com **avaliação 0–5 anônima** e **Score** agregado por usuário.
Atualização quase em tempo real por polling.

> Itens que dependem de chaves externas (a ativar): score por **IA de sentimento**
> (promotor/neutro/detrator), análise de 90 dias do R.A.C por **agente Claude**
> (`ANTHROPIC_API_KEY`) e avaliação do cliente por **WhatsApp/e-mail** (Z-API/Locaweb).

**Fase 3 — Modelos, Lotes e Agendamentos** (concluída):

- **Modelos de tarefa** pré-cadastrados, com tipo, responsável padrão, prazo (em dias),
  tags, cliente e **etapas/procedimentos** (que viram subtarefas ao instanciar).
- **Lotes**: agrupam vários modelos e criam todas as tarefas de uma vez.
- **Agendamentos** recorrentes (diária/semanal/mensal/anual, com intervalo, data de
  início/fim e hora). As tarefas são geradas automaticamente quando vencem (geração
  "preguiçosa" ao acessar o sistema, sem necessidade de worker externo).

**Fase 2 — Usuários e Permissões** (concluída): login real (e-mail/senha com hash),
sessão por cookie assinado, **perfis de acesso** com permissões cadastráveis,
**grupos de acesso** (membros + perfis concedidos) e cadastros de **Clientes** e
**Projetos**. O menu e as páginas respeitam as permissões do usuário.

Regras de tarefa adicionais:

- **Visibilidade:** cada usuário vê apenas as tarefas das quais é dono, colaborador ou
  onde foi mencionado. O perfil com a permissão *"Ver todas as tarefas"* (Administrador)
  enxerga todas.
- **Colaboradores de tarefas:** é possível adicionar outros usuários como colaboradores;
  a tarefa passa a aparecer no Meu Tarefo deles destacada em **verde**.
- **Marcação de Tarefa - MD:** ao escrever **@usuario** num comentário, a tarefa entra na
  coluna "Marcação de Tarefa - MD" da pessoa marcada. No comentário há um botão **Check**
  para baixar (resolver) a marcação.
- **Responsabilidade dividida:** a responsabilidade é dividida igualmente entre os
  participantes (dono + colaboradores). O botão **Finalizar Tarefa** oferece:
  *(1) Finalizar apenas a sua Colaboração* (qualquer participante) — conclui a sua parte; ou
  *(2) Finalizar 100% da Tarefa* (**apenas o dono ou o Administrador**) — conclui tudo.
  Quando todos finalizam a sua parte, a tarefa é concluída automaticamente.
- **Hierarquia de subtarefas:** o **dono** da tarefa (quem a recebe) pode abrir subtarefas
  e atribuí-las a outros usuários. É permitido abrir subtarefa de subtarefa — até **2 níveis**
  abaixo da tarefa principal (principal → subtarefa → sub-subtarefa). A subtarefa atribuída
  também aparece como **cartão próprio** no "Meu Tarefo" do responsável, indicando a tarefa-pai.

Fase 1 — Núcleo de Tarefas: cadastro completo de tarefas com persistência em
PostgreSQL, visões **Kanban** e **Lista** com ordenação, página de detalhe com
**comentários de evolução** (data/hora), **subtarefas** (com regra de dependência
sequencial) e **anexos**.

### Acesso de demonstração

Usuários de exemplo (senha **`tarefo123`**):

| E-mail | Perfil |
|--------|--------|
| admin@azuladministradora.com.br | Administrador (tudo) |
| brunotga@yahoo.com.br | Gestor |
| atendimento@azuladministradora.com.br | Membro |

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** com a paleta da Azul Administradora
- **PostgreSQL** via driver `pg` (schema e dados de exemplo criados automaticamente)
- Hospedagem: **Render** com deploy automático via **GitHub**

## Rodando localmente

```bash
npm install
# configure a conexão do banco
cp .env.example .env   # e ajuste DATABASE_URL para o seu PostgreSQL
npm run dev
```

Acesse http://localhost:3000 — você será direcionado para o login. Use o botão **Entrar**
(autenticação real entra na Fase 2) para ver a tela **Meu Tarefo** já com tarefas de exemplo.

### Banco de dados

A aplicação cria o schema e insere dados de exemplo automaticamente na primeira
requisição (`lib/db.ts` → `ready()`), bastando uma `DATABASE_URL` de PostgreSQL válida.
No Render, o banco é provisionado pelo `render.yaml`.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run start` | Sobe o build de produção |
| `npm run lint` | Verificação de lint |

## Deploy (Render)

O arquivo [`render.yaml`](./render.yaml) descreve o serviço. No Render: **New → Blueprint**,
aponte para este repositório e o deploy passa a ser automático a cada push.

## Roadmap

Ver seção 9 da [minuta](./MINUTA_ENTENDIMENTO.md). Resumo:

0. **Setup** — estrutura, CI/CD, paleta, tela inicial ✅
1. **Núcleo de Tarefas** — cadastro completo + Kanban/Lista ✅
2. **Usuários e Permissões** — login, perfis, grupos, clientes, projetos ✅
3. **Modelos e Agendamentos** — templates, lotes e recorrências ✅
4. **Comunicação Interna** — chat 1‑1, grupos e canais por cliente ✅ (atual)
5. **Refinos** — notificações, relatórios, UX
