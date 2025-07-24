# N8N Clone Setup Commands

## Initial Project Setup

```bash
# Create new Nx workspace with Bun
npx create-nx-workspace@latest weconnect-n8n-pro --preset=nest --packageManager=bun

cd weconnect-n8n-pro

# Install additional dependencies
bun add @nestjs/platform-fastify @nestjs/websockets @nestjs/platform-socket.io
bun add @nestjs/bull bullmq ioredis
bun add @nestjs/mongoose mongoose
bun add @prisma/client prisma
bun add socket.io @nestjs/jwt passport passport-jwt
bun add kafka-node apache-kafka-node
bun add @nestjs/cache-manager cache-manager
bun add @nestjs/throttler
bun add @nestjs/swagger swagger-ui-express
bun add class-validator class-transformer
bun add winston @nestjs/common
bun add @opentelemetry/api @opentelemetry/auto-instrumentations-node

# Dev dependencies
bun add -d @types/socket.io @types/node
bun add -d jest @nestjs/testing supertest
bun add -d @types/jest @types/supertest
```

## Generate Services

```bash
# Core services
npx nx g @nx/nest:app api-gateway
npx nx g @nx/nest:app workflow-engine
npx nx g @nx/nest:app execution-engine
npx nx g @nx/nest:app node-registry
npx nx g @nx/nest:app connector-hub
npx nx g @nx/nest:app realtime-gateway
npx nx g @nx/nest:app scheduler-engine
npx nx g @nx/nest:app webhook-service
npx nx g @nx/nest:app analytics-engine
npx nx g @nx/nest:app notification-hub
npx nx g @nx/nest:app admin-service

# Generate libraries
npx nx g @nx/js:lib shared --directory=libs/shared
npx nx g @nx/js:lib database --directory=libs/database
npx nx g @nx/js:lib messaging --directory=libs/messaging
npx nx g @nx/js:lib execution --directory=libs/execution
npx nx g @nx/js:lib nodes --directory=libs/nodes
npx nx g @nx/js:lib monitoring --directory=libs/monitoring
```

## Environment Configuration

```bash
# Create environment files
touch .env.local
touch .env.production

# Database setup
docker-compose up -d postgresql redis mongodb kafka
```

## Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # PostgreSQL - Primary database
  postgresql:
    image: postgres:16-alpine
    container_name: n8n-postgresql
    environment:
      POSTGRES_DB: weconnect_n8n
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres123
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  # MongoDB - Document storage
  mongodb:
    image: mongo:7
    container_name: n8n-mongodb
    environment:
      MONGO_INITDB_ROOT_USERNAME: mongo
      MONGO_INITDB_ROOT_PASSWORD: mongo123
      MONGO_INITDB_DATABASE: weconnect_n8n
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis/Valkey - Cache and queues
  redis:
    image: valkey/valkey:7-alpine
    container_name: n8n-redis
    command: valkey-server --appendonly yes --maxmemory 1gb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "valkey-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Kafka - Event streaming
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    container_name: n8n-zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    container_name: n8n-kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1

  # MeiliSearch - Search engine
  meilisearch:
    image: getmeili/meilisearch:v1.5
    container_name: n8n-meilisearch
    ports:
      - "7700:7700"
    environment:
      MEILI_ENV: development
      MEILI_MASTER_KEY: your-master-key-here
    volumes:
      - meilisearch_data:/meili_data

  # InfluxDB - Time series metrics
  influxdb:
    image: influxdb:2.7-alpine
    container_name: n8n-influxdb
    ports:
      - "8086:8086"
    environment:
      INFLUXDB_DB: weconnect_metrics
      INFLUXDB_ADMIN_USER: admin
      INFLUXDB_ADMIN_PASSWORD: admin123
    volumes:
      - influxdb_data:/var/lib/influxdb2

  # Prometheus - Metrics collection
  prometheus:
    image: prom/prometheus:latest
    container_name: n8n-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./infrastructure/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  # Grafana - Metrics visualization
  grafana:
    image: grafana/grafana:latest
    container_name: n8n-grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin123
    volumes:
      - grafana_data:/var/lib/grafana

volumes:
  postgres_data:
  mongodb_data:
  redis_data:
  meilisearch_data:
  influxdb_data:
  prometheus_data:
  grafana_data:
```

## Environment Variables

```bash
# .env.local
NODE_ENV=development
PORT=3000

# Database URLs
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/weconnect_n8n"
MONGODB_URI="mongodb://mongo:mongo123@localhost:27017/weconnect_n8n"
REDIS_URL="redis://localhost:6379"

# Kafka
KAFKA_BROKERS="localhost:9092"

# Search
MEILISEARCH_URL="http://localhost:7700"
MEILISEARCH_API_KEY="your-master-key-here"

# Metrics
INFLUXDB_URL="http://localhost:8086"
INFLUXDB_TOKEN="your-influxdb-token"
PROMETHEUS_URL="http://localhost:9090"

# Security
JWT_SECRET="your-super-secret-jwt-key-here"
ENCRYPTION_KEY="your-32-character-encryption-key-here"

# External APIs
OPENAI_API_KEY="your-openai-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# WebRTC
TURN_SERVER_URL="turn:your-turn-server.com:3478"
TURN_USERNAME="your-turn-username"
TURN_PASSWORD="your-turn-password"
```

## Prisma Setup

```bash
# Initialize Prisma
npx prisma init

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database
npx prisma db seed
```

## Development Commands

```bash
# Start all services
docker-compose up -d

# Start development servers
npx nx serve api-gateway
npx nx serve workflow-engine
npx nx serve execution-engine
npx nx serve realtime-gateway

# Run tests
npx nx test api-gateway
npx nx test workflow-engine

# Build all services
npx nx build:all

# Run all tests
npx nx test

# Lint and format
npx nx lint:all
npx nx format:all
```

## Production Deployment

```bash
# Build production images
docker build -t n8n-api-gateway ./apps/api-gateway
docker build -t n8n-workflow-engine ./apps/workflow-engine
docker build -t n8n-execution-engine ./apps/execution-engine

# Deploy with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Or deploy to Kubernetes
kubectl apply -f ./infrastructure/kubernetes/
```

## Monitoring Setup

```bash
# Setup Prometheus configuration
mkdir -p infrastructure/prometheus
cat > infrastructure/prometheus/prometheus.yml << EOF
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'n8n-api-gateway'
    static_configs:
      - targets: ['localhost:3000']
  - job_name: 'n8n-workflow-engine'
    static_configs:
      - targets: ['localhost:3001']
  - job_name: 'n8n-execution-engine'
    static_configs:
      - targets: ['localhost:3002']
EOF

# Start monitoring stack
docker-compose up -d prometheus grafana
```

## Queue Management

```bash
# Install Bull Board for queue monitoring
bun add @bull-board/api @bull-board/express

# Access queue dashboard at http://localhost:3000/admin/queues
```

## Testing Commands

```bash
# Unit tests
bun test

# Integration tests
bun test:integration

# All tests
bun test:all

# Load testing
bun add -d artillery
artillery run load-test.yml

# Performance profiling
bun add -d clinic
clinic doctor -- bun start
```

## Health Checks

```bash
# Check all services health
curl http://localhost:3000/health
curl http://localhost:3001/health
curl http://localhost:3002/health

# Check database connections
curl http://localhost:3000/health/database
curl http://localhost:3000/health/redis
curl http://localhost:3000/health/kafka
```

## Security Setup

```bash
# Generate SSL certificates for production
openssl genrsa -out private-key.pem 2048
openssl req -new -x509 -key private-key.pem -out certificate.pem -days 365

# Setup HashiCorp Vault for secrets
docker run --cap-add=IPC_LOCK -d --name=vault -p 8200:8200 vault:latest

# Initialize Vault
vault operator init
vault operator unseal
```

## Performance Optimization

```bash
# Enable Bun for production
bun build --target node --outdir dist

# Setup CDN for static assets
# Configure nginx for load balancing
# Enable Redis clustering for high availability
# Setup database read replicas
```

## Backup and Recovery

```bash
# Database backups
pg_dump weconnect_n8n > backup.sql
mongodump --db weconnect_n8n --out backup/

# Redis backup
redis-cli --rdb backup.rdb

# Automated backup script
./scripts/backup.sh
```
