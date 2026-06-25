# Minuta de Entendimento do Projeto — Sistema "Tarefo"

**Cliente:** Azul Administradora — Smart Living
**Documento:** Minuta de Entendimento (para avaliação e aprovação antes da construção)
**Data:** 25/06/2026
**Status:** 🟡 Aguardando validação do solicitante

> Este documento descreve o **entendimento** da equipe sobre o que foi solicitado.
> Ele **não é** o sistema, e sim a base de alinhamento. Após sua aprovação (ou ajustes),
> seguimos para a construção. Os pontos marcados com ❓ são dúvidas que precisam de
> confirmação antes de iniciarmos.

---

## 1. Visão Geral

Construir o **Tarefo**, uma plataforma web de **gestão de tarefas e comunicação interna**
da Azul Administradora, hospedada em nuvem, com versionamento e deploy automático a partir
do **GitHub** (toda alteração feita/aprovada é replicada automaticamente para o ambiente).

O sistema reúne dois grandes pilares integrados:

1. **Gestão de Tarefas** — criação, fluxos, prazos, responsáveis, agendamentos e
   acompanhamento (visões Kanban e Lista).
2. **Comunicação Interna** — mensageria no estilo Slack/WhatsApp (1‑para‑1, grupos e
   **canais por cliente**, que funcionam como um "prontuário" do cliente).

O elo entre os dois pilares é o **Cliente**: tarefas e conversas de um mesmo cliente ficam
reunidas em um único lugar.

---

## 2. Objetivos do Projeto

- Centralizar o cadastro e o acompanhamento de todas as tarefas da empresa.
- Padronizar fluxos de trabalho recorrentes (tarefas e lotes pré-cadastrados).
- Dar visibilidade em tempo real do andamento das tarefas (Kanban + Lista filtrável).
- Concentrar a comunicação interna e o histórico de cada cliente em um só ambiente.
- Garantir hospedagem em nuvem com deploy contínuo via GitHub.
- Interface amigável e agradável, alinhada à identidade visual da Azul Administradora.

---

## 3. Escopo Funcional

### 3.1. Módulo de Tarefas

Quatro formas de originar uma tarefa:

| # | Tipo de origem | Descrição |
|---|----------------|-----------|
| A | **Tarefa pré-cadastrada (modelo)** | Tarefas-modelo com fluxo já definido (responsáveis, prazos e procedimentos). O usuário apenas instancia a partir do modelo. |
| B | **Lote de tarefas pré-cadastradas** | Conjunto de várias tarefas-modelo que são criadas de uma só vez, cada uma com seu fluxo, responsáveis e prazos. |
| C | **Tarefa avulsa** | Criada manualmente do zero, mas seguindo um fluxo de processos e responsáveis. |
| D | **Tarefa agendada (recorrente)** | Gerada automaticamente conforme frequência programada (diária, semanal, mensal, anual), com data/hora de início e fim. |

**Campos da tarefa:**

- Nome da tarefa
- **Tipo / prioridade:** Padrão, Urgente, Prioridade Máxima
- Data de Solicitação
- Data de Início da Tarefa
- Cliente vinculado (quando aplicável)
- Descrição
- **Comentários de evolução** — com registro automático de data, hora e autor
- **Anexos** — upload de arquivos
- **Subtarefas** — dependentes da tarefa principal (sequenciais ou paralelas)
- **Projeto vinculado** — indica se a tarefa pertence a algum projeto

> ❓ **A confirmar:** além dos campos acima, normalmente também são úteis:
> *responsável atual*, *prazo/data de finalização prevista*, *status* e *etapa do fluxo*.
> Confirmar se devemos incluí-los (recomendamos que sim, pois os filtros de ordenação
> do "Meu Tarefo" dependem de "data de finalização" e "solicitante").

#### Fluxos / Procedimentos
Cada modelo de tarefa pode definir uma sequência de **etapas**, cada uma com responsável
e prazo. O avanço de etapa pode ser manual (o responsável conclui) e gera registro no
histórico.

> ❓ **A confirmar:** as etapas do fluxo são livres por tarefa, ou existe um conjunto
> fixo de status padrão (ex.: *A Fazer → Em Andamento → Em Revisão → Concluída*)?

### 3.2. "Meu Tarefo" (Grid de Tarefas)

Tela principal de trabalho do usuário, com duas visualizações:

- **Kanban:** colunas por status/etapa, cartões arrastáveis.
- **Lista:** com **filtros e ordenação** por prioridade, data de finalização, solicitante,
  cliente, responsável, projeto, etc.

### 3.3. Módulo de Comunicação Interna (estilo Slack)

- **Conversa 1‑para‑1** entre usuários.
- **Grupos** de conversa (semelhante a grupos de WhatsApp).
- **Canais por cliente** — um canal por cliente cadastrado, funcionando como
  **prontuário do cliente**: dá acesso a *todas as tarefas vinculadas* àquele cliente e a
  *todas as conversas* relacionadas a ele.

Recursos previstos: envio de mensagens em tempo real, anexos nas mensagens, menções a
usuários, notificações e histórico pesquisável.

> ❓ **A confirmar:** o cliente é **externo** (somente referência interna, sem login) ou
> haverá acesso do próprio cliente ao sistema? (Entendimento atual: cliente é uma
> entidade de referência, **sem login** — toda a comunicação é entre usuários internos.)

### 3.4. Administração e Segurança

- **Cadastro de usuários** com e-mail e senha.
- **Perfis de acesso** com permissões cadastráveis (o que cada perfil pode ver/fazer).
- **Grupos de acesso** — permissões atribuídas por grupo.
- Cadastro de **Clientes** e de **Projetos** (entidades de apoio usadas pelas tarefas e canais).

---

## 4. Requisitos Não Funcionais

- **Hospedagem em nuvem** com **deploy automático a partir do GitHub** (CI/CD): toda
  alteração aprovada é publicada automaticamente no ambiente.
- **Layout amigável e agradável**, responsivo (desktop e mobile).
- **Identidade visual** seguindo a paleta da Azul Administradora (ver seção 6).
- Segurança: senhas com hash, controle de acesso por perfil/grupo, trilha de auditoria
  (data/hora/autor em comentários e mudanças de etapa).

---

## 5. Arquitetura Técnica Proposta (sugestão)

> Sugestão inicial para discussão — pode ser ajustada conforme preferência da empresa.

| Camada | Tecnologia sugerida | Motivo |
|--------|--------------------|--------|
| Frontend | React + TypeScript | Ecossistema maduro, ideal para Kanban e chat |
| Estilo / UI | Tailwind CSS + biblioteca de componentes | Layout rápido e consistente com a paleta Azul |
| Backend / API | Node.js (NestJS ou Express) | Produtividade e integração natural com o front |
| Banco de dados | PostgreSQL | Relacional, robusto para tarefas, clientes e permissões |
| Tempo real (chat) | WebSocket (Socket.IO) | Mensagens instantâneas e notificações |
| Armazenamento de anexos | Storage em nuvem (ex.: S3 / equivalente) | Anexos de tarefas e mensagens |
| Autenticação | JWT + hash de senha (bcrypt) | Login por e-mail/senha e controle de sessão |
| Hospedagem | Nuvem com deploy via GitHub (ex.: Render, Railway, Vercel/Fly) | Atende ao requisito de replicação automática |
| Versionamento/CI-CD | GitHub + GitHub Actions | Replicação automática das alterações |

> ❓ **A confirmar:** existe preferência de provedor de nuvem, orçamento ou stack já
> usada pela empresa? Se não houver, seguimos com a sugestão acima.

---

## 6. Identidade Visual / Paleta de Cores

Paleta extraída da logo **Azul Administradora — Smart Living** (valores aproximados,
a serem refinados com o arquivo oficial da marca):

| Uso | Cor | Hex aproximado |
|-----|-----|----------------|
| Azul escuro (primária / cabeçalhos) | Navy | `#0E4A66` |
| Azul médio (ações / destaques) | Azul | `#2E89B8` |
| Azul claro (apoio / detalhes) | Azul claro | `#4FA9DC` |
| Azul muito claro (fundos / hovers) | Azul suave | `#9FD2EC` |
| Fundo / superfícies | Branco / cinza claro | `#FFFFFF` / `#F4F7F9` |

> ❓ **A confirmar:** envio do manual de marca / valores oficiais de cor e da logo em alta
> resolução para uso na interface.

---

## 7. Proposta de Fases de Entrega (Roadmap)

| Fase | Entregáveis | Resumo |
|------|-------------|--------|
| **0 — Setup** | Repositório GitHub, ambiente em nuvem, CI/CD, esqueleto do projeto, paleta aplicada | Infra e deploy automático funcionando |
| **1 — Núcleo de Tarefas** | Cadastro de tarefas avulsas, campos, comentários, anexos, subtarefas, "Meu Tarefo" (Lista + Kanban) | Coração do sistema |
| **2 — Usuários e Permissões** | Login, usuários, perfis de acesso, grupos, clientes e projetos | Segurança e cadastros de apoio |
| **3 — Modelos e Agendamentos** | Tarefas pré-cadastradas, lotes e tarefas agendadas/recorrentes | Automação de fluxos |
| **4 — Comunicação Interna** | Chat 1‑1, grupos e canais por cliente (prontuário) | Pilar de comunicação |
| **5 — Refinos** | Notificações, relatórios, ajustes de UX, responsividade | Polimento |

---

## 8. Pontos em Aberto (precisam de confirmação) ❓

1. Incluir campos adicionais nas tarefas (responsável atual, prazo de finalização, status/etapa)? *(recomendado: sim)*
2. As etapas de fluxo são livres por tarefa ou há um conjunto fixo de status padrão?
3. O Cliente possui login (acesso externo) ou é apenas entidade de referência interna? *(entendimento: só referência)*
4. Há preferência de stack/provedor de nuvem ou orçamento definido?
5. Envio do manual de marca e da logo oficial em alta resolução.
6. Volume estimado de usuários e de tarefas/mês (para dimensionamento).
7. Necessidade de integrações (e-mail, Google Calendar, WhatsApp, ERP, etc.)?
8. Idioma do sistema (apenas Português?) e fuso horário padrão.

---

## 9. Próximos Passos

1. Você revisa esta minuta e responde aos pontos da seção 8.
2. Ajustamos o entendimento conforme seu retorno.
3. Com a minuta aprovada, iniciamos a **Fase 0** (setup do repositório, nuvem e CI/CD) e
   seguimos pelo roadmap.

---

*Documento gerado para avaliação. Nada será construído antes da sua aprovação.*
