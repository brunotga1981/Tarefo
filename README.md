# Tarefo

Sistema de **gestão de tarefas e comunicação interna** da **Azul Administradora — Smart Living**.

> 📄 O entendimento completo do projeto está em [`MINUTA_ENTENDIMENTO.md`](./MINUTA_ENTENDIMENTO.md).

## Status

**Fase 1 — Núcleo de Tarefas** (concluída): cadastro completo de tarefas com persistência
em PostgreSQL, visões **Kanban** e **Lista** com ordenação, página de detalhe com
**comentários de evolução** (data/hora), **subtarefas** (com regra de dependência
sequencial) e **anexos**.

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
1. **Núcleo de Tarefas** — cadastro completo + Kanban/Lista ✅ (atual)
2. **Usuários e Permissões** — login, perfis, grupos, clientes, projetos
3. **Modelos e Agendamentos** — templates, lotes e recorrências
4. **Comunicação Interna** — chat 1‑1, grupos e canais por cliente
5. **Refinos** — notificações, relatórios, UX
