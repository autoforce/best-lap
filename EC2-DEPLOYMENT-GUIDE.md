# EC2 Deployment Guide - TimescaleDB Only

Guia completo para deploy do TimescaleDB no AWS EC2.

## 📋 Visão Geral da Arquitetura

**Arquitetura Híbrida:**
- **AWS EC2**: TimescaleDB APENAS (self-hosted)
- **Redis Cloud**: Redis (external, free tier)
- **Render.com**: API + Admin + Metrics Collector + Dashboard

**Por que essa arquitetura?**
- ✅ TimescaleDB Community completo (continuous aggregates, compression, retention)
- ✅ Performance 3-5x melhor que PostgreSQL padrão do Render
- ✅ Custo otimizado: $17/mês EC2 + FREE Redis + $14/mês Render = **$31/mês total**
- ✅ Fácil escalar (upgrade EC2 instance quando necessário)
- ✅ Redis Cloud free tier é suficiente (30MB, 30 connections)

## 🚀 Passo 1: Criar Instância EC2

### 1.1 Configurações Recomendadas

**Instância:**
- **Tipo**: t3.small (2 vCPU, 2GB RAM) - $15/mês
- **OS**: Ubuntu Server 24.04 LTS
- **Storage**: 30GB GP3 SSD - $2.40/mês

**Security Group:**
- SSH (22): Seu IP
- PostgreSQL (5432): Render IPs ou 0.0.0.0/0 (temporário)

### 1.2 Criar via Console AWS

1. Acesse AWS Console → EC2 → Launch Instance
2. **Nome**: `best-lap-database`
3. **AMI**: Ubuntu Server 24.04 LTS (HVM, SSD Volume Type)
4. **Instance type**: t3.small
5. **Key pair**: Criar novo ou usar existente
6. **Network settings**:
   - Create security group
   - Allow SSH from your IP
   - Allow Custom TCP 5432 from 0.0.0.0/0 (vamos restringir depois para Render IPs)
7. **Storage**: 30 GB GP3
8. **Launch instance**

### 1.3 Criar via AWS CLI

```bash
# Criar security group
aws ec2 create-security-group \
  --group-name best-lap-db-sg \
  --description "Security group for Best Lap database"

# Permitir SSH
aws ec2 authorize-security-group-ingress \
  --group-name best-lap-db-sg \
  --protocol tcp --port 22 \
  --cidr YOUR_IP/32

# Permitir PostgreSQL
aws ec2 authorize-security-group-ingress \
  --group-name best-lap-db-sg \
  --protocol tcp --port 5432 \
  --cidr 0.0.0.0/0

# Lançar instância
# Nota: AMI ID varia por região, use o AMI Finder no console ou comando abaixo para obter o mais recente
aws ec2 describe-images \
  --owners 099720109477 \
  --filters "Name=name,Values=ubuntu/images/hvm-ssd/ubuntu-noble-24.04-amd64-server-*" \
  --query 'sort_by(Images, &CreationDate)[-1].ImageId' \
  --output text

# Exemplo de comando de launch (substitua AMI_ID pelo resultado acima)
aws ec2 run-instances \
  --image-id ami-XXXXXXXXX \
  --instance-type t3.small \
  --key-name YOUR_KEY_NAME \
  --security-groups best-lap-db-sg \
  --block-device-mappings 'DeviceName=/dev/sda1,Ebs={VolumeSize=30,VolumeType=gp3}'
```

### 1.4 Criar Elastic IP (Recomendado)

Para evitar mudança de IP ao reiniciar instância:

```bash
# Console: EC2 → Elastic IPs → Allocate Elastic IP address
# Ou via CLI:
aws ec2 allocate-address --domain vpc
aws ec2 associate-address --instance-id i-xxxxx --allocation-id eipalloc-xxxxx
```

## 🔧 Passo 2: Configurar Instância EC2

### 2.1 Conectar via SSH

```bash
# Obter IP público da instância
# Console: EC2 → Instances → Copiar "Public IPv4 address"

# Conectar
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
```

### 2.2 Atualizar Sistema

```bash
sudo apt update
sudo apt upgrade -y
```

### 2.3 Instalar Docker

```bash
# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar usuário ao grupo docker (evita usar sudo)
sudo usermod -aG docker ubuntu

# Recarregar sessão (ou fazer logout/login)
newgrp docker

# Verificar instalação
docker --version
```

### 2.4 Instalar Docker Compose

```bash
# Instalar Docker Compose v2
sudo apt install -y docker-compose-plugin

# Ou instalar standalone
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalação
docker-compose --version
```

### 2.5 Instalar Git

```bash
sudo apt install -y git
```

### 2.6 Instalar Node.js e pnpm (Opcional - para rodar migrations)

```bash
# Instalar Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar pnpm (usando standalone script - recomendado)
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Recarregar ambiente
source ~/.bashrc

# Verificar instalação
node --version
pnpm --version
```

## 📦 Passo 3: Deploy da Aplicação

### 3.1 Clonar Repositório

```bash
# No EC2
cd ~
git clone https://github.com/seu-usuario/best-lap.git
cd best-lap
```

### 3.2 Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env
nano .env
```

**Configuração mínima:**

```bash
# Database Configuration (TimescaleDB on EC2)
DB_HOST=localhost
DB_PORT=5432
DB_USER=best_lap
DB_PASSWORD=SuaSenhaSegura123!  # MUDE ISSO! Use senha forte para produção
DB_NAME=best_lap_db
```

**⚠️ IMPORTANTE**: Troque as senhas padrão por senhas fortes!

### 3.3 Executar Deploy

```bash
# Dar permissão ao script
chmod +x scripts/deploy-ec2.sh

# Fazer deploy
./scripts/deploy-ec2.sh

# Ou usar comando npm
pnpm db:up
```

**O que o script faz:**
1. ✅ Verifica se Docker está instalado
2. ✅ Cria arquivo .env se não existir
3. ✅ Para containers existentes
4. ✅ Faz pull das imagens Docker
5. ✅ Inicia TimescaleDB + Redis
6. ✅ Verifica health dos serviços
7. ✅ Habilita extensão TimescaleDB

### 3.4 Verificar Deploy

```bash
# Ver status dos containers
docker ps

# Ver logs
docker logs timescaledb
docker logs redis

# Ou com docker-compose
docker-compose -f docker-compose.db.yml logs -f
```

### 3.5 Testar Conexão

```bash
# Conectar ao PostgreSQL
docker exec -it timescaledb psql -U best_lap -d best_lap_db

# Dentro do psql:
# Verificar extensão TimescaleDB
SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';

# Listar tabelas (ainda vazio)
\dt

# Sair
\q

# Redis está no Redis Cloud (external), não no EC2
# Para testar Redis Cloud, veja seção "Setup Redis Cloud" abaixo
```

## 🔒 Passo 4: Configurar Segurança

### 4.1 Configurar PostgreSQL para Aceitar Conexões Remotas

Por padrão, o container já está configurado para aceitar conexões. Mas se precisar ajustar:

```bash
# Verificar configuração atual
docker exec timescaledb cat /var/lib/postgresql/data/postgresql.conf | grep listen_addresses

# Deve mostrar: listen_addresses = '*'
```

### 4.2 Setup Redis Cloud (Free Tier)

Redis roda externamente no Redis Cloud, não no EC2.

**Passos:**

1. **Criar conta**: https://redis.com/try-free/
2. **Criar database**:
   - Plan: Free (30MB, 30 connections)
   - Region: us-east-2 (Ohio) - mesmo da Render
   - Cloud: AWS
3. **Obter credenciais**:
   - Redis Cloud Dashboard → Database → Configuration
   - Copiar: **Endpoint**, **Port**, **Password**
   - Exemplo:
     - Endpoint: `redis-12345.c1.us-east-2.redislabs.com`
     - Port: `12345`
     - Password: `abc123xyz`

**Testar conexão:**

```bash
# Instalar redis-cli localmente (se ainda não tem)
sudo apt install redis-tools

# Testar conexão
redis-cli -h redis-12345.c1.us-east-2.redislabs.com -p 12345 -a abc123xyz ping
# Deve retornar: PONG
```

### 4.3 Restringir Security Group (Produção)

Após deploy funcionar, restrinja acesso apenas aos IPs do Render:

**Render Outbound IPs (Ohio region - us-east-2):**
- Consulte: https://render.com/docs/static-outbound-ip-addresses

```bash
# Remover regra aberta (0.0.0.0/0)
aws ec2 revoke-security-group-ingress \
  --group-name best-lap-db-sg \
  --protocol tcp --port 5432 \
  --cidr 0.0.0.0/0

# Adicionar apenas IPs do Render (exemplo)
aws ec2 authorize-security-group-ingress \
  --group-name best-lap-db-sg \
  --protocol tcp --port 5432 \
  --cidr 18.217.0.0/16  # Exemplo - use IPs reais do Render
```

**Ou via Console:**
1. EC2 → Security Groups → best-lap-db-sg
2. Inbound rules → Edit inbound rules
3. Remover 0.0.0.0/0
4. Adicionar IPs específicos do Render

### 4.4 Configurar Firewall UFW (Opcional)

```bash
# Habilitar UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 5432/tcp  # PostgreSQL
sudo ufw allow 6379/tcp  # Redis
sudo ufw enable

# Verificar status
sudo ufw status
```

## 🔌 Passo 5: Conectar Render ao EC2

### 5.1 Obter Informações do EC2

```bash
# IP Público (ou Elastic IP) do EC2
curl ifconfig.me

# Verificar se porta 5432 está acessível
# No seu computador local:
telnet YOUR_EC2_IP 5432
```

### 5.2 Configurar Variáveis no Render

No Render Dashboard, configure para cada serviço (API, Admin, Metrics Collector):

**Database:**
- `DB_HOST`: IP público do EC2 (ex: 3.145.123.45)
- `DB_PORT`: 5432
- `DB_USER`: best_lap
- `DB_PASSWORD`: SuaSenhaSegura123!
- `DB_NAME`: best_lap_db

**Redis (Redis Cloud):**
- `REDIS_HOST`: Endpoint do Redis Cloud (ex: redis-12345.c1.us-east-2.redislabs.com)
- `REDIS_PORT`: Porta do Redis Cloud (ex: 12345)
- `REDIS_PASSWORD`: Senha do Redis Cloud (obrigatório)

### 5.3 Testar Conexão do Render

Depois de configurar, faça deploy no Render e verifique logs:

```bash
# No Render Dashboard → Service → Logs
# Procure por:
# ✅ "Database connected"
# ✅ "Redis connected"
# ❌ "ETIMEDOUT" ou "ECONNREFUSED" indica problema de conectividade
```

## 🗄️ Passo 6: Rodar Migrations

### Opção 1: Rodar do Render (Recomendado)

As migrations rodam automaticamente quando a API inicia pela primeira vez.

**Verificar logs da API no Render:**
```
[INFO] Running migrations...
[INFO] Migration 1732050948683-SetupHypertable executed successfully
[INFO] Migration 1732278565824-AddContinuousAggregatesAndPolicies executed successfully
```

### Opção 2: Rodar Manualmente do EC2

```bash
# No EC2
cd ~/best-lap

# Instalar dependências (se ainda não fez)
pnpm install

# Rodar migrations
pnpm --filter=@best-lap/infra db:migrate

# Ou seed data (se necessário)
pnpm --filter=@best-lap/infra db:seed
```

### 6.1 Verificar Migrations

```bash
# Conectar ao banco
docker exec -it timescaledb psql -U best_lap -d best_lap_db

# Ver tabelas criadas
\dt

# Ver hypertables
SELECT * FROM timescaledb_information.hypertables;

# Ver continuous aggregates
SELECT * FROM timescaledb_information.continuous_aggregates;

# Sair
\q
```

## 📊 Passo 7: Monitoramento

### 7.1 Verificar Status dos Containers

```bash
# Status
docker ps

# Uso de recursos
docker stats

# Logs em tempo real
docker-compose -f docker-compose.db.yml logs -f
```

### 7.2 Monitorar Banco de Dados

```bash
# Tamanho do banco
docker exec timescaledb psql -U best_lap -d best_lap_db -c "
SELECT pg_size_pretty(pg_database_size('best_lap_db')) AS database_size;
"

# Número de métricas
docker exec timescaledb psql -U best_lap -d best_lap_db -c "
SELECT COUNT(*) FROM metrics;
"

# Tamanho das tabelas
docker exec timescaledb psql -U best_lap -d best_lap_db -c "
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
"
```

### 7.3 Monitorar Redis

```bash
# Info do Redis
docker exec redis redis-cli INFO

# Número de chaves
docker exec redis redis-cli DBSIZE

# Memória usada
docker exec redis redis-cli INFO memory | grep used_memory_human
```

### 7.4 Configurar CloudWatch (Opcional)

```bash
# Instalar CloudWatch Agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i amazon-cloudwatch-agent.deb

# Configurar e iniciar (requer IAM role)
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json \
  -s
```

## 🔄 Atualizações e Manutenção

### Atualizar Imagens Docker

```bash
cd ~/best-lap
docker-compose -f docker-compose.db.yml pull
docker-compose -f docker-compose.db.yml up -d
```

### Atualizar Código da Aplicação

```bash
cd ~/best-lap
git pull origin main
./scripts/deploy-ec2.sh --rebuild
```

### Reiniciar Serviços

```bash
# Reiniciar tudo
docker-compose -f docker-compose.db.yml restart

# Reiniciar apenas TimescaleDB
docker restart timescaledb

# Reiniciar apenas Redis
docker restart redis
```

### Limpar Espaço em Disco

```bash
# Limpar containers parados
docker container prune -f

# Limpar imagens não usadas
docker image prune -a -f

# Limpar volumes não usados (CUIDADO!)
docker volume prune -f

# Limpar tudo (exceto volumes)
docker system prune -a -f
```

## 🚨 Troubleshooting

### Problema: Render não consegue conectar ao EC2

**Sintomas:** Logs mostram `ETIMEDOUT` ou `ECONNREFUSED`

**Soluções:**
1. Verificar Security Group permite porta 5432 e 6379
2. Verificar se usou IP público correto (não privado)
3. Testar conectividade: `telnet EC2_IP 5432`
4. Verificar se PostgreSQL está ouvindo em todas interfaces:
   ```bash
   docker exec timescaledb netstat -tuln | grep 5432
   # Deve mostrar: 0.0.0.0:5432
   ```

### Problema: Senha do PostgreSQL não funciona

**Sintomas:** `FATAL: password authentication failed`

**Soluções:**
1. Verificar senha no .env do EC2
2. Verificar senha configurada no Render
3. Resetar senha:
   ```bash
   docker exec -it timescaledb psql -U postgres -c "ALTER USER best_lap PASSWORD 'NovaSenha';"
   ```

### Problema: TimescaleDB extension não está habilitada

**Sintomas:** `function create_hypertable does not exist`

**Soluções:**
```bash
docker exec -it timescaledb psql -U best_lap -d best_lap_db -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"
```

### Problema: Disco cheio

**Sintomas:** `no space left on device`

**Soluções:**
```bash
# Verificar uso
df -h

# Limpar logs Docker
sudo sh -c "truncate -s 0 /var/lib/docker/containers/*/*-json.log"

# Limpar recursos Docker não usados
docker system prune -a -f --volumes

# Aumentar EBS volume (AWS Console ou CLI)
```

### Problema: Containers não iniciam após reiniciar EC2

**Sintomas:** `docker ps` não mostra containers

**Soluções:**
```bash
# Containers com restart policy devem iniciar automaticamente
# Se não iniciarem:
cd ~/best-lap
docker-compose -f docker-compose.db.yml up -d
```

### Problema: Performance lenta

**Soluções:**
1. Verificar recursos da instância EC2:
   ```bash
   top
   docker stats
   ```
2. Aumentar instância EC2 (t3.small → t3.medium)
3. Configurar autovacuum do PostgreSQL
4. Verificar se continuous aggregates estão funcionando

## 💰 Estimativa de Custos

### EC2 Infrastructure (TimescaleDB ONLY)
- **EC2 t3.small**: $15.18/mês (2 vCPU, 2GB RAM)
- **EBS 30GB GP3**: $2.40/mês
- **Elastic IP**: Grátis (enquanto associado)
- **Transferência de dados**: ~$0.09/GB (primeiros 100GB grátis)

**Total EC2: ~$17.58/mês**

### Redis Cloud
- **Free tier**: $0/mês (30MB storage, 30 connections)

**Total Redis: $0/mês**

### Render Services
- **API**: $7/mês
- **Admin**: Grátis
- **Metrics Collector**: $7/mês
- **Dashboard**: Grátis

**Total Render: $14/mês**

### **CUSTO TOTAL: ~$31.58/mês**

### Comparação de Arquiteturas
| Arquitetura | Custo/mês | TimescaleDB Features | Performance | Complexidade |
|-------------|-----------|----------------------|-------------|--------------|
| Render Full Stack | $21 | ❌ Apache only | Padrão | Baixa |
| Hybrid (EC2 DB only) | $31.58 | ✅ Community full | 3-5x melhor | Média |
| Full EC2 | $17.58 | ✅ Community full | 3-5x melhor | Alta |

**Recomendação**: Hybrid (EC2 DB + Render Services) = Melhor custo-benefício com performance excelente

## 📚 Recursos Adicionais

- [TimescaleDB Docs](https://docs.timescale.com/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [AWS EC2 Pricing](https://aws.amazon.com/ec2/pricing/)
- [Render Outbound IPs](https://render.com/docs/static-outbound-ip-addresses)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)

## 🎯 Checklist Rápido

### EC2 Setup
- [ ] Instância EC2 criada (t3.small, Ubuntu 24.04 LTS)
- [ ] Elastic IP alocado e associado
- [ ] Security Group configurado (portas 22, 5432)
- [ ] Docker e Docker Compose instalados
- [ ] Repositório clonado
- [ ] Arquivo .env configurado com senha forte do DB
- [ ] Deploy executado com sucesso (`./scripts/deploy-ec2.sh`)
- [ ] TimescaleDB extension habilitada
- [ ] Conexão testada localmente

### Redis Cloud Setup
- [ ] Conta Redis Cloud criada
- [ ] Database criado (free tier, region Ohio)
- [ ] Credenciais copiadas (host, port, password)
- [ ] Conexão testada com redis-cli

### Render Setup
- [ ] Variáveis DB configuradas no Render (DB_HOST, DB_PASSWORD)
- [ ] Variáveis Redis configuradas no Render (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
- [ ] GOOGLE_API_KEY configurada
- [ ] Deploy realizado no Render
- [ ] Conexão Render→EC2 funcionando
- [ ] Conexão Render→Redis Cloud funcionando
- [ ] Migrations executadas com sucesso
- [ ] Dashboard acessível e funcionando

### Opcional
- [ ] Backups configurados
- [ ] Monitoramento configurado
- [ ] Security Group restrito para Render IPs apenas

Pronto! Seu ambiente EC2 está configurado e pronto para produção.
