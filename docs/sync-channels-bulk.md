# Sincronização de canais em bulk (Make)

Rota para que cenários externos (por exemplo, no Make) mantenham os canais do Best Lap iguais aos de uma origem. Cada origem tem um nome (`source`), e cada canal guarda de qual origem veio por último.

```
POST /sync/channels/bulk
```

Exemplo de uso com dois cenários:

| Cenário no Make | `source` |
|---|---|
| Canais do Autódromo clássico | `autodromo-classico` |
| Canais do Autódromo workspace | `autodromo-workspace` |

## Autenticação

Envie a chave no header `x-api-key`. O valor é a variável de ambiente `SYNC_API_KEY` da API (mínimo de 32 caracteres).

- Sem a variável configurada no servidor, a rota responde `503`.
- Com chave ausente ou errada, responde `401`.

## Modos

| `mode` | Cria canais novos | Atualiza dados e status | Desativa canais que sumiram da origem |
|---|---|---|---|
| `partial` (padrão) | sim | sim | não |
| `full` | sim | sim | sim, **apenas os da mesma `source`** |

- Canais de outra origem nunca são tocados. Um sync `full` do clássico não desativa canais do workspace.
- No modo `full`, o cenário deve mandar **a lista completa da origem em uma única requisição**. Se a lista vier em partes, cada parte desativaria o que está nas outras.
- Canais cadastrados antes desta rota não têm `source`. Eles só passam a pertencer a uma origem quando aparecem num payload, então nenhum deles é desativado por engano.
- Páginas nunca são removidas, para preservar o histórico de métricas.

## Proteções

- **Desativação em massa:** um sync `full` que desativaria mais da metade dos canais ativos da origem (com pelo menos 5 canais afetados) é recusado com `422` e nada é gravado. Isso protege contra uma lista truncada (paginação que falhou, filtro vazio). Se a mudança for intencional, reenvie com `"force": true`.
- **Duplicados:** dois canais com o mesmo `internal_link` no payload resultam em `422`. Barras no final do link são ignoradas na comparação (`https://site.com.br/` é igual a `https://site.com.br`).
- **Teste sem risco:** `"dry_run": true` devolve exatamente o que seria feito, sem gravar nada.

## Body

```json
{
  "source": "autodromo-classico",
  "mode": "full",
  "dry_run": false,
  "force": false,
  "channels": [
    {
      "name": "Concessionária Exemplo",
      "domain": "exemplo.com.br",
      "internal_link": "https://exemplo.com.br",
      "theme": "aurora",
      "active": true,
      "is_reference": false,
      "provider_id": "uuid-opcional",
      "pages": [
        { "name": "Home", "path": "/" },
        { "name": "Seminovos", "path": "/seminovos" }
      ]
    }
  ]
}
```

| Campo | Obrigatório | Observação |
|---|---|---|
| `source` | sim | Slug em minúsculas com hífens, por exemplo `autodromo-classico` |
| `mode` | não | `partial` (padrão) ou `full` |
| `dry_run` | não | `true` para simular |
| `force` | não | `true` para liberar uma desativação em massa |
| `channels` | sim | De 1 a 5000 canais |
| `channels[].active` | sim | Status do canal na origem. `false` desativa no Best Lap |
| `channels[].is_reference` e `provider_id` | não | Quando omitidos, o valor atual do Best Lap é mantido |
| `channels[].pages[].path` | sim | Sem `/` no início ele é adicionado automaticamente |

## Resposta (200)

```json
{
  "source": "autodromo-classico",
  "mode": "full",
  "dry_run": false,
  "timestamp": "2026-10-23T14:28:45.354Z",
  "statistics": {
    "channels": { "received": 3, "created": 1, "updated": 1, "unchanged": 1, "reactivated": 0, "deactivated": 2 },
    "pages": { "created": 2, "updated": 0 }
  },
  "created": ["https://d.com.br"],
  "reactivated": [],
  "deactivated": [
    { "internal_link": "https://b.com.br", "reason": "inactive_in_source" },
    { "internal_link": "https://c.com.br", "reason": "missing_from_source" }
  ],
  "errors": []
}
```

- `reason: inactive_in_source`: a origem mandou o canal com `active: false`.
- `reason: missing_from_source`: o canal não veio no payload de um sync `full`.
- Falhas de um canal específico aparecem em `errors` e não interrompem os demais.

As listas `created`, `reactivated` e `deactivated` servem para o cenário avisar o time (por exemplo, no Slack) sobre o que mudou.

## Configuração no Make

1. Busque os canais da origem e monte um único array com um **Array aggregator**.
2. Use o módulo **HTTP → Make a request**:
   - Method: `POST`
   - URL: `https://<api>/sync/channels/bulk`
   - Headers: `x-api-key: <SYNC_API_KEY>` e `Content-Type: application/json`
   - Body type: Raw, JSON, com `source`, `mode: "full"` e o array em `channels`
3. Na primeira execução de cada cenário, mande `"dry_run": true` e confira as listas da resposta.
4. Trate `422` como alerta: alguém precisa olhar antes de reenviar com `force`.

## Diferença para as rotas antigas

Todas as rotas `/sync/*` exigem o header `x-api-key`. Cenários que chamam `/add` ou `/import` precisam passar a enviá-lo no deploy desta versão.

| Rota | Comportamento |
|---|---|
| `POST /sync/channels/add` | Cria e atualiza, nunca desativa. Não registra `source` |
| `POST /sync/channels/import` | Desativa **qualquer** canal fora do payload, de todas as origens |
| `POST /sync/channels/bulk` | Cria, atualiza e, no modo `full`, desativa só os canais da mesma origem |

Depois que os cenários do Make migrarem para `/bulk`, as rotas `/add` e `/import` podem ser removidas.
