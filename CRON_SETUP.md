# Agendamento diário das 00:00 (BRT)

O sistema já publica os cartões de aniversário e processa os agendamentos de
tarefas de forma automática no **primeiro acesso do dia** (cron preguiçoso). Para
disparar **exatamente à meia-noite (00:00 BRT)**, mesmo sem ninguém acessar,
configure um agendador chamando o endpoint:

```
GET https://SEU-APP.onrender.com/api/cron?token=<CRON_SECRET>
```

- `SEU-APP.onrender.com`: a URL pública do serviço `tarefo` no Render.
- `<CRON_SECRET>`: valor gerado automaticamente pelo Render (veja em
  Render → serviço `tarefo` → **Environment** → `CRON_SECRET`).

> Importante: **00:00 BRT = 03:00 UTC**. A maioria dos agendadores usa UTC.

O endpoint é **idempotente** — pode ser chamado mais de uma vez sem duplicar nada.

## Opção A — Agendador externo gratuito (recomendado)

1. Crie conta em https://cron-job.org (ou similar).
2. Novo cron job:
   - URL: `https://SEU-APP.onrender.com/api/cron?token=<CRON_SECRET>`
   - Agendamento: diário às **03:00 UTC**.
3. Salve. Pronto.

## Opção B — Render Cron Job (requer plano com suporte a Cron)

No Render: **New → Cron Job**, mesmo repositório:

- Schedule: `0 3 * * *`
- Build Command: `npm install`
- Command:
  ```
  node -e "fetch('http://tarefo:10000/api/cron?token='+process.env.CRON_SECRET).then(r=>r.text()).then(console.log)"
  ```
- Environment: adicione `CRON_SECRET` com o mesmo valor do serviço `tarefo`.

(Não incluímos o Cron Job no render.yaml para não quebrar a sincronização do
Blueprint em planos que não suportam Cron.)
