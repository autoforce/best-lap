# Channel Synchronization Guide

Este guia explica como configurar e usar a funcionalidade de sincronização de canais da Autoforce.

## Visão Geral

O sistema de sincronização permite manter os canais e páginas do Best Lap atualizados automaticamente com os dados da API da Autoforce. Ele:

- ✅ Cria novos canais e páginas automaticamente
- 🔄 Atualiza dados de canais e páginas existentes
- 🔴 Desativa canais que não existem mais na API
- 📊 Preserva páginas para manter histórico de métricas
- ⏰ Roda automaticamente via cron job
- 🔧 Pode ser executado manualmente via CLI ou API

## Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis no arquivo `.env` na raiz do projeto:

```bash
# Autoforce API Integration
AUTOFORCE_API_URL="https://api.autoforce.com/channels" # URL da API
AUTOFORCE_API_KEY="your-api-key-here" # Token de autenticação
SYNC_CHANNELS_CRON='0 2 * * *' # Cron expression (padrão: 2h da manhã)
SYNC_CHANNELS_ENABLED=true # Habilitar/desabilitar sync
```

### 2. Estrutura da API Autoforce

**IMPORTANTE**: As interfaces TypeScript em `packages/core/src/modules/sync/autoforce-api-types.ts` assumem uma estrutura genérica de resposta da API. Você precisará ajustá-las conforme a estrutura real da API da Autoforce.

Estrutura esperada (exemplo):

```typescript
{
  "channels": [
    {
      "name": "Nome do Canal",
      "domain": "exemplo.com.br",
      "internal_link": "exemplo", // Identificador único
      "theme": "automotive",
      "active": true,
      "is_reference": false,
      "provider_id": "uuid-optional",
      "pages": [
        {
          "name": "Home",
          "path": "/",
          "provider_id": "uuid-optional"
        }
      ]
    }
  ]
}
```

Se a estrutura da API for diferente, edite:
- `packages/core/src/modules/sync/autoforce-api-types.ts` (interfaces)
- `packages/core/src/services/autoforce-api-service.ts` (transformação de dados)

## Como Usar

### Sincronização Automática (Recomendado)

O sync roda automaticamente baseado no cron expression configurado:

```bash
# Inicia o metrics-collector (inclui o cron de sync)
pnpm dev

# Ou em produção
pnpm --filter=@best-lap/metrics-collector start
```

**Logs do cron:**
```
📅 Scheduling channel sync cron: 0 2 * * *
🔄 Starting channel synchronization...
📡 Fetched 50 channels from Autoforce API
🟢 Created channel: new-channel
🔄 Updated channel: existing-channel
📄 Created page: /about
✅ Channel synchronization completed successfully
⏱️  Duration: 12.34s
📊 Statistics:
  Channels: 5 created, 40 updated, 2 deactivated
  Pages: 15 created, 30 updated
```

### Sincronização Manual via CLI

Para rodar o sync manualmente (útil para testes):

```bash
# Localmente (com hot reload)
pnpm --filter=@best-lap/metrics-collector sync

# Ou em produção
cd apps/metrics-collector
node dist/sync.js
```

### Sincronização Manual via API

Você pode triggerar o sync via endpoint REST:

```bash
# Usando curl
curl -X POST http://localhost:3333/sync/channels

# Resposta de sucesso (200)
{
  "message": "Synchronization completed successfully",
  "timestamp": "2026-03-05T10:00:00.000Z",
  "statistics": {
    "channels": {
      "created": 5,
      "updated": 40,
      "deactivated": 2,
      "total": 50
    },
    "pages": {
      "created": 15,
      "updated": 30,
      "deactivated": 0,
      "total": 200
    }
  },
  "errors": []
}

# Resposta com erros parciais (200 com warnings)
{
  "message": "Synchronization completed successfully",
  "timestamp": "2026-03-05T10:00:00.000Z",
  "statistics": { ... },
  "errors": [
    {
      "type": "page",
      "identifier": "channel-id:/invalid-page",
      "error": "Invalid page path format"
    }
  ]
}

# Serviço desabilitado (503)
{
  "error": "Service Unavailable",
  "message": "Channel synchronization is disabled (SYNC_CHANNELS_ENABLED=false)"
}

# API não configurada (503)
{
  "error": "Service Unavailable",
  "message": "Autoforce API credentials not configured"
}

# Erro interno (500)
{
  "error": "Internal Server Error",
  "message": "Synchronization failed",
  "timestamp": "2026-03-05T10:00:00.000Z",
  "statistics": { ... },
  "errors": [ ... ]
}
```

O endpoint está documentado no Swagger em `http://localhost:3333/docs` sob a tag **sync**.

## Comportamento Detalhado

### Canais

1. **Novos Canais**: Criados automaticamente com `active=true`
2. **Canais Existentes**:
   - Identificados por `internal_link` (deve ser único)
   - Dados atualizados (name, domain, theme, etc.)
   - Se estava inativo e voltou na API, é reativado
3. **Canais Removidos**:
   - Marcados como `active=false`
   - **Não são deletados** para preservar métricas históricas

### Páginas

1. **Novas Páginas**: Criadas automaticamente
2. **Páginas Existentes**:
   - Identificadas por `path` + `channel_id`
   - Dados atualizados (name, provider_id)
3. **Páginas Removidas**:
   - **Mantidas no banco** (não são deletadas nem desativadas)
   - Isso preserva o histórico de métricas coletadas

> ⚠️ **Nota**: Páginas não têm campo `active` no momento. Se você precisar desativar páginas, será necessário adicionar este campo via migration.

## Troubleshooting

### Sync não está rodando

1. Verifique se `SYNC_CHANNELS_ENABLED=true`
2. Verifique se `AUTOFORCE_API_URL` e `AUTOFORCE_API_KEY` estão configuradas
3. Verifique os logs do metrics-collector:
   ```bash
   # Docker
   docker logs best-lap-metrics-collector --tail 50

   # Local
   # Veja o console onde rodou pnpm dev
   ```

### Erros de autenticação

```
❌ Autoforce API request failed: 401 Unauthorized
```

**Solução**: Verifique se `AUTOFORCE_API_KEY` está correto

### Erros de estrutura de dados

```
❌ Error syncing channel example: internal_link is required
```

**Solução**: A estrutura da API não corresponde às interfaces TypeScript. Edite:
- `packages/core/src/modules/sync/autoforce-api-types.ts`
- `packages/core/src/services/autoforce-api-service.ts`

### Sync parcial com erros

O sync pode completar com sucesso mas reportar erros em canais/páginas específicos. Exemplo:

```
✅ Channel synchronization completed successfully
⚠️  3 errors occurred during sync:
  - [channel] invalid-channel: internal_link is required
  - [page] channel-id:/bad-path: Invalid path format
```

Neste caso:
- O sync continua e processa os outros canais/páginas
- Erros são logados e retornados no resultado
- Corrija os dados na API Autoforce ou ajuste a validação

## Estrutura de Arquivos

```
packages/core/src/
├── modules/sync/
│   └── autoforce-api-types.ts # Interfaces TypeScript
├── services/
│   └── autoforce-api-service.ts # Cliente HTTP da API
└── usecases/sync/
    └── sync-channels-use-case.ts # Lógica de sincronização

apps/metrics-collector/src/
├── jobs/
│   └── sync-channels.ts # Job principal
└── jobs/cron/
    └── sync-channels-cron.ts # Agendamento cron

apps/api/src/http/modules/sync/
├── controllers/
│   └── trigger-sync.ts # Controller do endpoint
├── docs/
│   └── trigger-sync-docs.ts # Documentação Swagger
└── routes.ts # Definição de rotas
```

## Personalizações

### Alterar frequência do cron

Edite `SYNC_CHANNELS_CRON` no `.env`:

```bash
# A cada hora
SYNC_CHANNELS_CRON='0 * * * *'

# Três vezes ao dia (8h, 14h, 20h)
SYNC_CHANNELS_CRON='0 8,14,20 * * *'

# Toda segunda-feira às 3h
SYNC_CHANNELS_CRON='0 3 * * 1'
```

Formato: `minuto hora dia mês dia-da-semana`
- [Cron expression generator](https://crontab.guru/)

### Desabilitar sync temporariamente

```bash
SYNC_CHANNELS_ENABLED=false
```

O cron não será agendado e o endpoint retornará 503.

### Modo dry-run (em desenvolvimento)

O use case suporta um modo dry-run que apenas loga o que seria feito sem fazer alterações:

```typescript
const result = await syncChannelsUseCase.execute({ dryRun: true })
```

Para habilitar via API ou CLI, você precisaria adicionar um parâmetro opcional.

## Monitoramento

### Métricas a observar

- **Duração do sync**: Deve ser consistente (alguns segundos a poucos minutos)
- **Erros**: Não deve ter erros consistentes
- **Canais criados/atualizados**: Deve corresponder às mudanças esperadas
- **Canais desativados**: Investigar se foi intencional

### Logs importantes

```bash
# Início do sync
🔄 Starting channel synchronization...

# Fetch bem-sucedido
📡 Fetched 50 channels from Autoforce API

# Operações
🟢 Created channel: new-channel
🔄 Updated channel: existing-channel
🔴 Deactivated channel: old-channel
  ✅ Created page: /about
  📄 Updated page: /contact

# Resultado
✅ Channel synchronization completed successfully
⏱️  Duration: 12.34s
📊 Statistics: ...
```

## Segurança

- 🔒 **API Key**: Mantenha `AUTOFORCE_API_KEY` segura, não commite no git
- 🔒 **Endpoint**: Considere adicionar autenticação JWT ao endpoint `/sync/channels`
- 🔒 **Rate Limiting**: Considere adicionar rate limiting ao endpoint para evitar abuse

## Próximos Passos

- [ ] Adicionar autenticação JWT ao endpoint `/sync/channels`
- [ ] Adicionar campo `active` à tabela de páginas (migration)
- [ ] Implementar notificações (email/Slack) quando sync falhar
- [ ] Adicionar métricas de observabilidade (Prometheus/Grafana)
- [ ] Implementar retry automático em caso de falha
- [ ] Adicionar validação mais robusta dos dados da API
