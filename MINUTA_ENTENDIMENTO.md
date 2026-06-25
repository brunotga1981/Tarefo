# Minuta de Entendimento — Sistema "Tarefo"

**Cliente:** Azul Administradora — Smart Living
**Produto:** Tarefo — Plataforma de Gestão de Tarefas e Comunicação Interna
**Documento:** Minuta de Entendimento (v2) — para avaliação e aprovação antes da construção
**Data:** 25/06/2026
**Status:** 🟢 **Minuta aprovada** — todas as decisões validadas; pendente apenas o envio das credenciais das integrações

> **Para que serve este documento:** registrar, de forma clara, *o que entendemos* que
> deve ser construído, *como* pretendemos construir e *em que ordem*. Ele é a base de
> alinhamento — nada é construído antes da sua aprovação. Itens marcados com ❓ são
> decisões que dependem de você.

---

## 1. Em uma frase

Uma plataforma web, hospedada em nuvem e com publicação automática via GitHub, que reúne
**a gestão de tarefas da empresa** (com fluxos, prazos, responsáveis, agendamentos e visões
Kanban/Lista) e **a comunicação interna** (estilo Slack: conversas, grupos e canais por
cliente), tendo o **Cliente** como elo que conecta tarefas e conversas em um "prontuário".

---

## 2. Objetivos

| # | Objetivo | Como o Tarefo atende |
|---|----------|----------------------|
| 1 | Centralizar e padronizar tarefas | Modelos, lotes, tarefas avulsas e agendadas com fluxos definidos |
| 2 | Dar visibilidade do andamento | "Meu Tarefo" com Kanban e Lista filtrável |
| 3 | Concentrar a comunicação e o histórico do cliente | Chat interno + canal/prontuário por cliente |
| 4 | Operar em nuvem com atualização contínua | Deploy automático a partir do GitHub (CI/CD) |
| 5 | Interface agradável e com a cara da empresa | UI responsiva na paleta da Azul Administradora |

---

## 3. Conceitos do Sistema (glossário)

- **Tarefa:** unidade de trabalho com responsável, prazo, fluxo e histórico.
- **Modelo de Tarefa:** tarefa pré-cadastrada (template) com fluxo, responsáveis e prazos já definidos; serve para instanciar tarefas rapidamente.
- **Lote:** agrupamento de vários modelos que são criados juntos, de uma vez.
- **Tarefa Agendada:** regra de recorrência que gera tarefas automaticamente (diária/semanal/mensal/anual).
- **Subtarefa:** tarefa filha, dependente da principal (sequencial ou paralela).
- **Fluxo / Etapa:** sequência de estágios pelos quais a tarefa avança (cada etapa com responsável e prazo).
- **Cliente:** entidade de referência da empresa; conecta tarefas e conversas. *(Entendimento: sem login próprio.)*
- **Projeto:** agrupador opcional de tarefas relacionadas.
- **Canal do Cliente:** espaço de comunicação que funciona como prontuário — reúne tarefas e conversas daquele cliente.

---

## 4. Módulos Funcionais

### 4.1. Tarefas

**Formas de criar uma tarefa:**

| Origem | O que é | Resultado |
|--------|---------|-----------|
| **Modelo (pré-cadastrada)** | Instancia a partir de um template | 1 tarefa com fluxo/responsáveis/prazos pré-definidos |
| **Lote** | Seleciona um conjunto de modelos | Várias tarefas criadas de uma vez |
| **Avulsa** | Criada do zero | 1 tarefa seguindo um fluxo de processos/responsáveis |
| **Agendada (recorrente)** | Define frequência e janela (início/fim) | Tarefas geradas automaticamente no tempo |

**Campos da tarefa (conforme solicitado):**

- Nome da tarefa
- Tipo / prioridade: **Padrão, Urgente, Prioridade Máxima**
- Data de Solicitação
- Data de Início da Tarefa
- Cliente (quando aplicável)
- Descrição
- Comentários de evolução — com **data, hora e autor** automáticos
- Anexos (upload de arquivos)
- Subtarefas (dependentes/sequenciais)
- Projeto vinculado (sim/não + qual)

**Campos adicionais (confirmados)** *(necessários para filtros e Kanban)*:
responsável atual, prazo/data de finalização prevista, status/etapa atual, tags.

**Regras de negócio previstas:**
- Todo comentário, mudança de etapa e de responsável fica registrado no **histórico** (auditoria).
- Tarefa agendada gera novas tarefas conforme a regra, respeitando a janela início/fim.
- **Subtarefa sequencial só pode iniciar quando a anterior for concluída** (confirmado).
- **Fluxos/etapas são livres por tarefa** (não há conjunto fixo) — confirmado.

### 4.2. "Meu Tarefo" (tela principal)

- **Kanban:** colunas por etapa/status; cartões arrastáveis entre colunas.
- **Lista:** com **filtros e ordenação** por prioridade, data de finalização, solicitante,
  responsável, cliente, projeto e status.
- Indicadores visuais de prioridade (cores) e de atraso de prazo.

### 4.3. Comunicação Interna (estilo Slack)

- **Conversa 1‑para‑1** entre usuários.
- **Grupos** (semelhante a grupos de WhatsApp).
- **Canais por cliente (prontuário):** um canal por cliente cadastrado, com acesso a
  **todas as tarefas** vinculadas e **todas as conversas** daquele cliente.
- Recursos: mensagens em tempo real, anexos, menções (@), notificações e busca no histórico.

### 4.4. Usuários, Perfis e Permissões

- **Usuários:** cadastro com e-mail e senha (senha com hash).
- **Perfis de acesso:** conjuntos de permissões cadastráveis (o que cada perfil vê/faz).
- **Grupos de acesso:** permissões atribuídas por grupo de usuários.
- **Cadastros de apoio:** Clientes e Projetos.

---

## 5. Modelo de Dados (visão preliminar)

Entidades principais e como se relacionam (resumo):

- **Usuário** ←→ pertence a → **Grupo de Acesso**; possui um ou mais **Perfis**.
- **Perfil** → contém → **Permissões**.
- **Cliente** → possui → muitas **Tarefas** e um **Canal**.
- **Projeto** → agrupa → muitas **Tarefas**.
- **Tarefa** → tem → **Comentários**, **Anexos**, **Subtarefas**, **Histórico**, **Etapas**.
- **Modelo de Tarefa** → instancia → **Tarefa**; **Lote** → agrupa **Modelos**.
- **Agendamento** → gera → **Tarefas** ao longo do tempo.
- **Canal / Conversa / Grupo** → contém → **Mensagens** (com autor, data/hora, anexos).

> Diagrama formal (ERD) será entregue na Fase 0, após validação desta minuta.

---

## 6. Requisitos Não Funcionais

- **Nuvem + CI/CD:** publicação automática a partir do GitHub a cada alteração aprovada.
- **Responsivo:** desktop e mobile.
- **Segurança:** hash de senha, controle de acesso por perfil/grupo, trilha de auditoria.
- **Identidade visual:** paleta da Azul Administradora (seção 8).
- **Desempenho:** mensageria em tempo real e listas com paginação/filtragem eficientes.

---

## 7. Arquitetura Técnica (sugestão para discussão)

| Camada | Sugestão | Por quê |
|--------|----------|---------|
| Frontend | React + TypeScript + Tailwind CSS | Ágil para Kanban e chat; fácil aplicar a paleta |
| Backend | Node.js (NestJS) | Estruturado, bom para regras de fluxo e permissões |
| Banco de dados | PostgreSQL | Relacional e robusto |
| Tempo real | WebSocket (Socket.IO) | Chat e notificações instantâneas |
| Anexos | Storage em nuvem (S3 ou equivalente) | Arquivos de tarefas e mensagens |
| Autenticação | JWT + bcrypt | Login por e-mail/senha |
| Hospedagem | **Render** (assinatura existente) com deploy automático via GitHub | Atende à replicação automática |
| CI/CD | GitHub Actions | Build, testes e publicação automáticos |

> ❓ Existe stack ou provedor já usados pela empresa? Se não, seguimos com o acima.

### 7.1. Integrações Externas (confirmadas)

| Integração | Serviço | Uso no Tarefo | Como conecta |
|------------|---------|---------------|--------------|
| **E-mail** | **Locaweb** | Envio de notificações (atribuição de tarefas, prazos, alertas) | SMTP da Locaweb |
| **WhatsApp** | **Z-API** | Avisos e comunicação via WhatsApp | API HTTP da Z-API |
| **ERP** | **Superlógica** | Sincronizar dados (ex.: clientes/contratos) entre o ERP e o Tarefo | API REST da Superlógica |

> **Pontos a detalhar de cada integração** ❓:
> - **Locaweb (e-mail):** credenciais SMTP (host, porta, usuário, senha) e remetente padrão.
> - **Z-API (WhatsApp):** instância e token; quais eventos disparam mensagem e modelos de texto.
> - **Superlógica (ERP):** credenciais/app-token da API; **quais dados** sincronizar
>   (clientes, contratos, unidades?) e **direção** (ERP → Tarefo, Tarefo → ERP, ou ambos).
>   *Sugestão inicial:* importar **clientes** da Superlógica para alimentar os cadastros e
>   os canais/prontuários do Tarefo.

---

## 8. Identidade Visual / Paleta de Cores

Valores aproximados extraídos da logo (refinaremos com o material oficial da marca):

| Uso | Cor | Hex aprox. |
|-----|-----|-----------|
| Primária / cabeçalhos | Navy | `#0E4A66` |
| Ações / destaques | Azul | `#2E89B8` |
| Apoio / detalhes | Azul claro | `#4FA9DC` |
| Fundos / hovers | Azul suave | `#9FD2EC` |
| Superfícies | Branco / cinza claro | `#FFFFFF` / `#F4F7F9` |

---

## 9. Roadmap de Entrega

| Fase | Entregáveis |
|------|-------------|
| **0 — Setup** | Repositório, ambiente em nuvem, CI/CD, esqueleto do app, ERD, paleta aplicada |
| **1 — Núcleo de Tarefas** | Tarefa avulsa completa (campos, comentários, anexos, subtarefas) + "Meu Tarefo" (Lista + Kanban) |
| **2 — Usuários e Permissões** | Login, usuários, perfis, grupos, Clientes e Projetos |
| **3 — Modelos e Agendamentos** | Modelos, lotes e tarefas agendadas/recorrentes |
| **4 — Comunicação Interna** | Chat 1‑1, grupos e canais por cliente (prontuário) |
| **5 — Refinos** | Notificações, relatórios, ajustes de UX e responsividade |

---

## 10. Decisões do Solicitante (validadas)

| # | Tema | Decisão |
|---|------|---------|
| 1 | Campos adicionais nas tarefas | ✅ **Sim** — incluir responsável, prazo de finalização, status/etapa e tags. |
| 2 | Etapas do fluxo | ✅ **Livres por tarefa** — algumas tarefas terão fluxos maiores/personalizados. |
| 3 | Subtarefa sequencial | ✅ **Sim** — a subtarefa só pode iniciar após a anterior ser concluída. |
| 4 | Acesso do Cliente | ✅ **Somente interno** — cliente é referência; não há login externo. |
| 5 | Hospedagem | ✅ Código no **GitHub**; app publicado no **Render** (assinatura já existente), com deploy automático a partir do GitHub. |
| 6 | Identidade visual | ✅ **Paleta azul da Azul Administradora** (tons apresentados na seção 8). |
| 7 | Volume estimado | ✅ **~60 usuários** e **~5.000 tarefas/mês**. |
| 8 | Integrações | ✅ E-mail **Locaweb**, WhatsApp **Z-API**, ERP **Superlógica** (ver seção 7.1). |
| 9 | Idioma e fuso | ✅ **Português (pt-BR)** e fuso **América/São_Paulo**. |

> **Hospedagem (item 5):** o **GitHub** guarda o código/versionamento e o **Render**
> (assinatura já contratada pelo cliente) hospeda o app online, fazendo **deploy
> automático** a cada alteração aprovada — atendendo ao requisito de replicação automática.

---

## 11. Próximos Passos

1. Você revisa esta minuta e responde aos pontos da seção 10.
2. Ajustamos conforme seu retorno.
3. Com a minuta aprovada, iniciamos a **Fase 0** e seguimos pelo roadmap.

---

*Documento para avaliação. Nada será construído antes da sua aprovação.*
