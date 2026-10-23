# Checklist de deploy da versão oficial

O que muda no ambiente ao publicar esta versão e o que conferir depois.

## 1. Antes do deploy

- [ ] **Make:** adicione o header `x-api-key: <SYNC_API_KEY>` em todos os cenários que chamam `/sync/*`. Sem ele, as chamadas passam a receber `401`. Migre para `POST /sync/channels/bulk` quando puder (veja `sync-channels-bulk.md`).
- [ ] **Troque a senha do banco.** `best_lap` estava commitada no `render-api.yaml`; ela saiu do arquivo, mas continua valendo no EC2 até ser trocada.
- [ ] Confira que existe pelo menos um usuário para entrar no dashboard. Para criar um admin: `ADMIN_EMAIL=... ADMIN_PASSWORD=... pnpm --filter=@best-lap/infra db:seed` (sem `ADMIN_PASSWORD`, uma senha aleatória é gerada e mostrada uma única vez).

## 2. Variáveis de ambiente

| Variável | Onde | Obrigatória | Observação |
|---|---|---|---|
| `JWT_SECRET` | API | sim | Mínimo de 32 caracteres. A API não sobe sem ela; collector e admin não precisam mais dela |
| `SYNC_API_KEY` | API | para usar `/sync/*` | Mínimo de 32 caracteres. Sem ela, `/sync/*` responde `503` |
| `ADMIN_TOKEN` | Admin | sim | Senha do Bull Board (usuário `admin`). O painel não sobe sem ela |
| `CORS_ORIGIN` | API | recomendado | URL do dashboard. Aceita lista separada por vírgula |
| `CRON_TIMEZONE` | API e collector | não | Padrão `America/Sao_Paulo`. **Muda o horário real das coletas** (veja abaixo) |
| `SLACK_WEBHOOK_URL` | Collector | não | Incoming webhook do canal de alertas. Sem ela, alertas e resumo semanal ficam desligados |
| `DASHBOARD_URL` | Collector | não | Usada nos links das mensagens do Slack |
| `ALERTS_CRON` / `WEEKLY_DIGEST_CRON` | Collector | não | Padrão: todo dia às 9h e segunda às 9h |
| `PSI_TIMEOUT_MS` | Collector | não | Padrão 90000 |
| `DB_LOGGING` | API e collector | não | `true` volta a logar cada query (só para depuração) |
| `DB_POOL_MAX` | API e collector | não | Conexões por processo, padrão 5. O Postgres de produção aceita 25 no total |

`SEED_THEMES_URL` não é mais usada e pode ser removida.

### Horário das coletas

Antes, o cron rodava no fuso do servidor. No Render, que usa UTC, `0 8,14,20 * * *` coletava às **5h, 11h e 17h de Brasília**. Com `CRON_TIMEZONE=America/Sao_Paulo`, as coletas passam a acontecer às 8h, 14h e 20h de Brasília, como o comentário do `render.yaml` dizia. Para manter o horário antigo, use `CRON_TIMEZONE=UTC`.

## 3. O que acontece no deploy

- A API aplica 4 migrations: coluna `channels.source`, índices em `channels`/`pages`, novas janelas de refresh dos agregados e a tabela `page_insights`.
- Se houver páginas duplicadas (mesmo canal e caminho), a migration cria um índice comum em vez do único e lista as duplicadas no log. Limpe-as e crie o índice `UQ_pages_channel_path` depois.
- O collector não roda mais migrations; só a API.
- As coletas passam a ter até 3 tentativas com espera crescente. Falhas aparecem no Bull Board.

## 4. Depois do deploy

- [ ] `GET /health` responde `{"status":"ok","database":"ok","redis":"ok"}`.
- [ ] `GET /channels` sem token responde `401`; com login no dashboard, as telas carregam.
- [ ] O Bull Board pede usuário `admin` e a `ADMIN_TOKEN`.
- [ ] Depois da primeira coleta, a aba “O que corrigir” de um canal mostra recomendações.
- [ ] Se configurou o Slack, o primeiro alerta chega no horário de `ALERTS_CRON`.

## 5. Histórico já perdido

A política antiga de refresh dos agregados (janela de 90 dias com dados brutos guardados por 14) apagava o histórico diário a cada refresh. Num teste, 25 de 41 dias de médias diárias sumiram. A migration nova impede que isso continue, mas o que já foi apagado não volta.
