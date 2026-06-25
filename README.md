# Tarefo

Sistema de **gestão de tarefas e comunicação interna** da **Azul Administradora — Smart Living**.

> 📄 O entendimento completo do projeto está em [`MINUTA_ENTENDIMENTO.md`](./MINUTA_ENTENDIMENTO.md).

## Status

**Fase 0 — Setup** (em andamento): estrutura do projeto, paleta da marca e tela inicial navegável (login + "Meu Tarefo").

## Stack

- **Next.js 14** (App Router) + **React 18** + **TypeScript**
- **Tailwind CSS** com a paleta da Azul Administradora
- **PostgreSQL** (a partir da Fase 2)
- Hospedagem: **Render** com deploy automático via **GitHub**

## Rodando localmente

```bash
npm install
npm run dev
```

Acesse http://localhost:3000 — você será direcionado para o login. Use o botão **Entrar**
(sem autenticação ainda nesta fase) para ver a tela **Meu Tarefo**.

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

0. **Setup** — estrutura, CI/CD, paleta, tela inicial ✅ (atual)
1. **Núcleo de Tarefas** — cadastro completo + Kanban/Lista
2. **Usuários e Permissões** — login, perfis, grupos, clientes, projetos
3. **Modelos e Agendamentos** — templates, lotes e recorrências
4. **Comunicação Interna** — chat 1‑1, grupos e canais por cliente
5. **Refinos** — notificações, relatórios, UX
