# Render Deployment Guide - Full Stack

Este documento descreve o processo completo de deploy da aplicação Best Lap na Render, incluindo todos os serviços: API, Admin, Metrics Collector, Dashboard, PostgreSQL e Redis.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      RENDER.COM                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   API (Web)  │  │ Admin (Web)  │  │  Dashboard      │  │
│  │  Node.js     │  │  Node.js     │  │  (Static Site)  │  │
│  │  Port: 3333  │  │  Port: 4000  │  │                 │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│         │                 │                    │            │
│         │                 │                    │            │
│  ┌──────┴─────────────────┴────────────────────┘            │
│  │                                                           │
│  │  ┌─────────────────────────┐  ┌────────────────────┐    │
│  │  │  Metrics Collector      │  │   PostgreSQL 14    │    │
│  │  │  (Background Worker)    │  │   (TimescaleDB)    │    │
│  │  │  Node.js + Lighthouse   │  │                    │    │
│  │  └──────────┬──────────────┘  └─────────┬──────────┘    │
│  │             │                            │               │
│  │             └────────────┬───────────────┘               │
│  │                          │                               │
│  │                    ┌─────┴──────┐                        │
│  │                    │   Redis    │                        │
│  │                    │  (Cache &  │                        │
│  │                    │   Queues)  │                        │
│  │                    └────────────┘                        │
│  │                                                           │
└──┴───────────────────────────────────────────────────────────┘
```

## Serviços

### 1. Web Services

| Serviço | Tipo | Plano | RAM | Descrição | URL |
|---------|------|-------|-----|-----------|-----|
| best-lap-api | Web Service | Starter | 512MB | REST API Fastify + Swagger | `https://best-lap-api.onrender.com` |
| best-lap-admin | Web Service | Free | 512MB | Bull Board (queue monitoring) | `https://best-lap-admin.onrender.com` |
| best-lap-dashboard | Static Site | Free | - | React + Vite dashboard | `https://best-lap-dashboard.onrender.com` |

### 2. Background Workers

| Serviço | Tipo | RAM | Descrição |
|---------|------|-----|-----------|
| best-lap-metrics-collector | Worker | 1GB | Cron jobs + BullMQ + Lighthouse |

### 3. Databases & Cache

| Serviço | Tipo | Plano | Specs | Descrição |
|---------|------|-------|-------|-----------|
| best-lap-db | PostgreSQL 14 (Render) | Basic-256mb | 256MB RAM, 0.1 CPU | TimescaleDB extension |
| Redis Cloud | Redis (External) | Free | 30MB RAM, 30 connections | BullMQ queues + cache |

## Custos Estimados

### Opção 1: Produção Recomendada (Balanceada)

| Serviço | Plano | Custo Mensal (USD) | Notas |
|---------|-------|-------------------|-------|
| API | Starter | $7 | Sem cold starts |
| Admin | Free | $0 | Cold starts OK (uso esporádico) |
| Metrics Collector | Starter | $7 | Worker precisa estar sempre on (cron) |
| Dashboard | Free (Static) | $0 | CDN global |
| PostgreSQL (Render) | Basic-256mb | ~$7 | $6 + storage ($0.30/GB) |
| Redis Cloud | Free | $0 | 30MB free tier |
| **TOTAL** | | **$21/mês** | |

**Benefícios:**
- ✅ API sem cold starts (sempre online)
- ✅ Worker sempre rodando para cron jobs
- ✅ Backups automáticos do PostgreSQL
- ✅ SSL/HTTPS incluso em tudo
- ✅ Métricas usa PageSpeed API (sem Chrome headless)
- ✅ Redis Cloud free tier (30MB, 30 conexões)

**Upgrades opcionais:**
- Admin para Starter: +$7/mês (evita cold starts no painel)
- PostgreSQL para Basic-1gb: +$12/mês (1GB RAM, melhor performance)
- PostgreSQL para Pro-4gb: +$48/mês (4GB RAM, produção pesada)
- Redis Cloud pago: $5-10/mês (se precisar mais RAM/conexões)

### Opção 2: Desenvolvimento/Staging (Mínimo Custo)

| Serviço | Plano | Custo Mensal (USD) |
|---------|-------|-------------------|
| API | Free | $0 |
| Admin | Free | $0 |
| Metrics Collector | Starter | $7 |
| Dashboard | Free (Static) | $0 |
| PostgreSQL (Render) | Free | $0 |
| Redis Cloud | Free | $0 |
| **TOTAL** | | **$7/mês** |

**Limitações:**
- ⚠️ Cold starts após 15min de inatividade (API e Admin)
- ⚠️ Worker precisa de plano pago (não dorme, roda cron jobs)
- ⚠️ 750h/mês gratuitas para serviços web (suficiente para dev/staging)
- ⚠️ PostgreSQL free **expira em 30 dias** (precisa recriar mensalmente)
- ⚠️ Sem backups automáticos no PostgreSQL free
- ⚠️ Storage fixo de 1GB no plano free

**Alternativa sem coleta de métricas (100% FREE):**
- Não rodar Metrics Collector = **$0/mês**
- Adequado para testes de frontend/API apenas
- ⚠️ PostgreSQL free expira em 30 dias - precisa recriar

**Recomendação para Staging persistente:**
- Use PostgreSQL Basic-256mb (~$7/mês) ao invés de Free
- Evita recriar banco todo mês
- **Total: $14/mês** (API + Collector + PostgreSQL)

**Perfeito para:**
- Testes rápidos (< 30 dias)
- POCs e demos temporárias
- Desenvolvimento local com banco cloud

### Opção 3: Híbrida (Render + EC2)

Se você já tem EC2 com PostgreSQL rodando:

| Componente | Plataforma | Custo Mensal (USD) |
|-----------|-----------|-------------------|
| API (Starter) + Admin (Free) + Dashboard (Free) + Collector (Starter) | Render | $14 |
| PostgreSQL | EC2 t3.micro (existente) | ~$12 |
| Redis Cloud | Free | $0 |
| **TOTAL** | | **$26/mês** |

**⚠️ Nota:** Opção 1 Full Render ($21/mês) é **MAIS BARATA** que a híbrida!

**Quando usar híbrida:**
- ✅ Já tem EC2 rodando com outros serviços
- ✅ Quer controle total do banco de dados
- ✅ PostgreSQL no EC2 tem mais recursos que Starter
- ✅ Precisa de compliance específico de dados

**Desvantagens vs Full Render:**
- ❌ Mais caro ($26 vs $21)
- ❌ Maior complexidade operacional
- ❌ Latência entre Render (Ohio) e EC2 (US East)
- ❌ Precisa configurar IP allowlist para conexões
- ❌ Sem backups automáticos (precisa configurar)

## Instruções de Deploy

### Pré-requisitos

1. **Conta na Render:** https://render.com
2. **Repositório Git** conectado (GitHub/GitLab)
3. **Google API Key** (para PageSpeed API): https://console.cloud.google.com/apis/credentials
4. **Redis Cloud** (free tier): https://redis.com/try-free/

### Passo 1: Configurar Redis Cloud

1. Acesse https://redis.com/try-free/ e crie uma conta gratuita
2. Crie um novo database:
   - Name: `best-lap-redis`
   - Cloud: AWS
   - Region: `us-east-1` (próximo ao Render Ohio)
   - Plan: **Free** (30MB, 30 conexões)
3. Após criar, copie as credenciais da página do database:
   - **Public endpoint:** `redis-xxxxx.c1.us-east-1-2.ec2.redns.redis-cloud.com:12345`
     - Separe em **REDIS_HOST** (antes dos `:`) e **REDIS_PORT** (depois dos `:`)
   - **Default user password:** Clique no ícone 👁️ para revelar e copie
4. **Guarde essas 3 informações** (HOST, PORT, PASSWORD) - você vai configurar no Render depois

### Passo 2: Preparar o Repositório

```bash
# 1. Commit o arquivo render.yaml
git add render.yaml RENDER-DEPLOYMENT.md
git commit -m "feat: add render full-stack deployment configuration"
git push origin main
```

### Passo 3: Criar Blueprint na Render

1. Acesse o [Render Dashboard](https://dashboard.render.com/)
2. Clique em **"New"** → **"Blueprint"**
3. Conecte seu repositório GitHub/GitLab
4. Selecione o branch `main`
5. O Render detectará automaticamente o `render.yaml`
6. Clique em **"Apply"**

### Passo 4: Configurar Variáveis Obrigatórias

Após aplicar o blueprint, configure as variáveis marcadas com `sync: false` em cada serviço:

#### API Service
```
GOOGLE_API_KEY=your_google_api_key_here
REDIS_HOST=redis-xxxxx.c1.us-east-1-2.ec2.redns.redis-cloud.com
REDIS_PORT=12345
REDIS_PASSWORD=your_redis_password
```

#### Admin Service
```
REDIS_HOST=redis-xxxxx.c1.us-east-1-2.ec2.redns.redis-cloud.com
REDIS_PORT=12345
REDIS_PASSWORD=your_redis_password
```

#### Metrics Collector
```
GOOGLE_API_KEY=your_google_api_key_here
REDIS_HOST=redis-xxxxx.c1.us-east-1-2.ec2.redns.redis-cloud.com
REDIS_PORT=12345
REDIS_PASSWORD=your_redis_password
SEED_THEMES_URL=https://... (opcional)
```

#### Dashboard (Static Site)
```
VITE_API_URL=https://best-lap-api.onrender.com
```

**Onde encontrar as credenciais do Redis Cloud:**

1. Acesse https://app.redislabs.com/ → **Databases**
2. Selecione seu database → Na página você verá:
   - **Public endpoint**: `redis-xxxxx.c1.us-east-1-2.ec2.redns.redis-cloud.com:12345`
     - **REDIS_HOST** = hostname (sem a porta)
     - **REDIS_PORT** = porta (depois dos `:`, ex: 12345)
   - **Default user password**: Clique no 👁️ para revelar → **REDIS_PASSWORD**

**Importante:**
- Use o mesmo Redis Cloud host/port/password para todos os serviços!
- Redis Cloud usa portas customizadas (não é 6379)
- Configure `VITE_API_URL` no Dashboard **após** o deploy da API

### Passo 5: Habilitar TimescaleDB (PostgreSQL)

A Render não habilita a extensão TimescaleDB por padrão. Execute:

1. Acesse o dashboard do banco `best-lap-db`
2. Vá em **"Connect"** e copie a string de conexão
3. Conecte via `psql` ou qualquer cliente PostgreSQL:

```bash
psql "postgres://best_lap:password@dpg-xxxxx-a.ohio-postgres.render.com/best_lap_db"
```

4. Execute:

```sql
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
```

5. Verifique:

```sql
SELECT * FROM pg_extension WHERE extname = 'timescaledb';
```

### Passo 6: Executar Migrations

Após o banco estar pronto com TimescaleDB:

1. Acesse o dashboard da **API** na Render
2. Vá em **"Shell"**
3. Execute:

```bash
cd apps/api
node -e "require('./dist/server.js')"  # Isso rodará as migrations automaticamente
```

Ou, se tiver um script específico:

```bash
pnpm --filter=@best-lap/infra db:migrate
```

### Passo 7: Seed de Dados (Opcional)

Se quiser popular o banco com dados iniciais:

```bash
pnpm --filter=@best-lap/infra db:seed
```

### Passo 8: Verificar Serviços

Verifique se todos os serviços estão online:

| Serviço | URL | Status Esperado |
|---------|-----|----------------|
| API | https://best-lap-api.onrender.com/health | `{"status":"ok"}` |
| API Docs | https://best-lap-api.onrender.com/docs | Swagger UI |
| Admin | https://best-lap-admin.onrender.com | Bull Board |
| Dashboard | https://best-lap-dashboard.onrender.com | React App |

### Passo 9: Testar Metrics Collector

O metrics collector roda em background. Para verificar:

1. Acesse o **Admin Panel**: https://best-lap-admin.onrender.com
2. Use o token de autenticação (disponível nas env vars do admin)
3. Verifique se as queues estão funcionando
4. Monitore os jobs de coleta de métricas

Para forçar coleta manual (via API ou shell):

```bash
# Via shell no metrics collector service
cd apps/metrics-collector
pnpm run collect
```

## Troubleshooting

### 1. Build Failures

**Problema:** `pnpm install` falha ou timeout

**Solução:**
- Aumente o timeout de build: `RENDER_BUILD_TIMEOUT=600` (10min)
- Verifique se `pnpm-lock.yaml` está commitado
- Use cache de build (enabled por padrão)

### 2. Metrics Collector OOM (Out of Memory)

**Problema:** Lighthouse consome muita memória

**Soluções:**
- Upgrade para plano Standard (1GB RAM) ou Pro (2GB)
- Reduzir `WORKER_CONCURRENCY` de 10 para 5
- Ajustar cron expression para espaçar coletas

### 3. Cold Starts (Plano Free)

**Problema:** API demora para responder após inatividade

**Soluções:**
- Upgrade para Starter ($7/mês) - **recomendado**
- Use serviço externo de ping (ex: cron-job.org) a cada 10min
- Aceitar cold starts em staging/dev

### 4. PostgreSQL Disk Full

**Problema:** Banco de dados atingiu limite de storage

**Soluções:**
- Upgrade para plano maior
- Implementar retenção de dados:
  ```sql
  -- Apagar métricas antigas
  DELETE FROM metrics WHERE collected_at < NOW() - INTERVAL '90 days';
  ```
- Usar compression policies do TimescaleDB

### 5. Redis Connection Issues

**Problema:** Serviços não conectam ao Redis

**Verificações:**
- `REDIS_HOST` e `REDIS_PORT` estão corretos?
- Redis está no mesmo region (ohio)?
- IP allowlist está vazio (permite internal network)?

## Monitoramento

### Logs

Acesse logs de cada serviço via Dashboard:
- **API:** https://dashboard.render.com/web/best-lap-api
- **Admin:** https://dashboard.render.com/web/best-lap-admin
- **Metrics Collector:** https://dashboard.render.com/web/best-lap-metrics-collector

Ou via CLI:
```bash
# Install Render CLI
npm install -g @render/cli

# View logs
render logs best-lap-api --tail 100
render logs best-lap-metrics-collector --follow
```

### Métricas

Render fornece métricas automáticas:
- CPU usage
- Memory usage
- Request rate
- Response time
- Error rate

Acesse em cada serviço: **Metrics** tab

### Alertas

Configure alertas no Render:
1. Dashboard → Service → **Notifications**
2. Configure Slack/Email para:
   - Deploy failures
   - High memory usage
   - Service crashes

## CI/CD

### Auto-Deploy

Render faz auto-deploy em push para `main` (padrão).

Para desabilitar ou customizar:
```yaml
# render.yaml
services:
  - type: web
    name: best-lap-api
    autoDeploy: false  # Deploy manual
    branch: production  # Deploy apenas do branch production
```

### Deploy Manual

Via CLI:
```bash
render deploy best-lap-api
```

Via Dashboard:
1. Acesse o serviço
2. Clique em **"Manual Deploy"**
3. Selecione branch/commit

### Rollback

Para reverter deploy:
1. Dashboard → Service → **Events**
2. Encontre deploy anterior
3. Clique em **"Rollback"**

## Segurança

### Environment Variables

**✅ NUNCA commite:**
- `GOOGLE_API_KEY`
- `JWT_SECRET`
- `ADMIN_TOKEN`
- Senhas de banco (auto-gerenciadas pela Render)

**Geração segura de secrets:**
```bash
# JWT_SECRET (já auto-gerado pela Render)
openssl rand -base64 32

# ADMIN_TOKEN (já auto-gerado pela Render)
openssl rand -hex 16
```

### CORS

Em produção, atualize `CORS_ORIGIN`:
```yaml
# render.yaml - API service
- key: CORS_ORIGIN
  value: "https://best-lap-dashboard.onrender.com"
```

### HTTPS

Render fornece SSL/HTTPS automático para todos os serviços.

### Database Access

PostgreSQL é acessível apenas:
- Via internal network (outros serviços Render)
- Via IP allowlist (se configurado)

**Para acesso externo (psql, DBeaver):**
1. Dashboard → Database → **Settings**
2. **Access Control** → Add your IP

## Backups

### PostgreSQL

**Planos Pagos (Basic, Pro, Accelerated):**
- Backups automáticos diários
- Retenção de 7 dias
- Point-in-time recovery

**Plano Free:**
- ⚠️ Sem backups automáticos
- ⚠️ **Expira em 30 dias**
- Faça backups manuais:
  ```bash
  pg_dump "postgres://user:pass@host/db" > backup.sql
  ```

### Redis

Redis **não tem backups** na Render. Dados em cache são voláteis.

Se precisar persistir dados importantes:
- Use PostgreSQL para dados críticos
- Implemente backup manual de filas BullMQ se necessário

## Planos PostgreSQL (Novos em 2024)

A Render descontinuou os planos antigos (Starter, Standard, Pro) e introduziu novos planos flexíveis:

### Planos Disponíveis:

**Free:**
- Storage: 1 GB fixo
- **⚠️ Expira após 30 dias**
- Sem backups automáticos
- Ideal para: Testes rápidos, POCs temporárias

**Basic (Recomendado para produção pequena):**
- `basic-256mb`: $6/mês + storage (256 MB RAM, 0.1 CPU)
- `basic-1gb`: $19/mês + storage (1 GB RAM, 0.5 CPU)
- `basic-4gb`: $75/mês + storage (4 GB RAM, 2 CPU)

**Pro (Produção média/grande):**
- Ratio 1:4 CPU-to-RAM
- De $55/mês (4GB) até $6,200/mês (512GB)

**Accelerated (Memory-intensive):**
- Ratio 1:8 CPU-to-RAM
- Para workloads que precisam muita memória

### Custo de Storage:
- **$0.30/GB/mês** (cobrado separadamente)
- Ajustável independentemente do plano de compute
- Exemplo: 10GB de storage = $3/mês adicional

### Migração do Antigo "Starter":
- Use `basic-256mb` (~$7/mês total com storage)
- Specs similares: 256MB RAM
- Inclui backups automáticos (7 dias de retenção)

**Referência:** https://render.com/docs/postgresql-refresh

## Escalabilidade

### Horizontal Scaling

Para escalar serviços web:
1. Dashboard → Service → **Settings**
2. **Scaling** → Increase instance count
3. Render faz load balancing automático

Exemplo:
- 1 instância: $7/mês
- 2 instâncias: $14/mês (2x throughput)

### Vertical Scaling (Web Services)

Para mais recursos nos serviços web (API, Admin):
1. Dashboard → Service → **Settings**
2. **Instance Type** → Upgrade plan
   - Free: 512MB RAM
   - Starter: 512MB RAM (sem cold starts)
   - Standard: 2GB RAM
   - Pro: 4GB RAM
   - Pro Plus: 8GB RAM

### Vertical Scaling (PostgreSQL)

Para upgrade do banco de dados:
1. Dashboard → Database → **Settings**
2. **Instance Type** → Upgrade plan
   - `basic-256mb` → `basic-1gb` (melhor performance)
   - `basic-1gb` → `pro-4gb` (alta disponibilidade)
3. Ajuste storage separadamente se necessário

## Migração de EC2 para Render

Se você já tem dados no EC2 e quer migrar:

### 1. Backup do PostgreSQL (EC2)

```bash
# No EC2
docker exec -it timescaledb pg_dump -U best_lap -d best_lap_db -F c > bestlap_backup.dump
```

### 2. Restore no Render

```bash
# Local machine com backup
pg_restore -h dpg-xxxxx-a.ohio-postgres.render.com \
  -U best_lap -d best_lap_db \
  --no-owner --no-acl \
  bestlap_backup.dump
```

### 3. Verificar Dados

```sql
SELECT COUNT(*) FROM channels;
SELECT COUNT(*) FROM pages;
SELECT COUNT(*) FROM metrics;
SELECT COUNT(*) FROM users;
```

## Próximos Passos

Após deploy bem-sucedido:

1. **Configure DNS Customizado (Opcional)**
   - Dashboard → Service → **Settings** → **Custom Domain**
   - Adicione: `api.bestlap.com`, `app.bestlap.com`

2. **Configure Monitoramento Externo**
   - Integre com Datadog, New Relic, ou Sentry
   - Configure health checks externos

3. **Otimize Build Times**
   - Use Docker multi-stage builds (já configurado)
   - Aproveite cache de dependencies

4. **Implemente Testes**
   - Pre-deploy health checks
   - Integration tests

5. **Documente APIs**
   - Swagger já está disponível em `/docs`
   - Considere adicionar Postman collection

## Referências

- [Render Docs](https://render.com/docs)
- [Render Blueprint Spec](https://render.com/docs/blueprint-spec)
- [Render PostgreSQL](https://render.com/docs/databases)
- [Render Redis](https://render.com/docs/redis)
- [TimescaleDB Docs](https://docs.timescale.com/)

## Suporte

Para problemas ou dúvidas:
- Render Support: https://render.com/support
- GitHub Issues: (seu repositório)
- Email: (seu email)
