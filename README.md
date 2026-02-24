# Best Lap

A comprehensive web performance monitoring platform built with TypeScript, featuring automated metrics collection, real-time dashboard, and queue-based background processing.

## Overview

Best Lap is a monorepo-based application that monitors web page performance using Lighthouse metrics. It provides a REST API, automated metrics collection, an administrative dashboard for queue monitoring, and a web interface for data visualization.

## Architecture

### Deployment Strategy
- **Backend Services (EC2)**: API, Admin Panel, Metrics Collector, TimescaleDB, Redis
- **Frontend (Render)**: Web Dashboard (React/Vite with TanStack Router)

### Monorepo Structure

```
best-lap/
├── apps/
│   ├── api/                    # Fastify REST API with Swagger
│   ├── metrics-collector/      # Background metrics collection service
│   ├── admin/                  # Bull Board dashboard for queue monitoring
│   └── web/                    # React dashboard (deployed on Render)
├── packages/
│   ├── core/                   # Shared business logic and utilities
│   ├── env/                    # Environment variable validation
│   └── infra/                  # Database (TypeORM) and Redis (BullMQ)
└── config/
    ├── eslint-config/          # ESLint configurations
    ├── prettier/               # Prettier configuration
    └── typescript-config/      # TypeScript configurations
```

## Key Features

- **REST API**: Type-safe Fastify server with Swagger documentation at `/docs`
- **Metrics Collection**: Automated Lighthouse performance analysis using cron jobs
- **Queue Management**: BullMQ-powered background job processing with Redis
- **Admin Dashboard**: Bull Board interface for monitoring and managing queues
- **Web Dashboard**: Modern React interface with TanStack Router and React Query
- **TimescaleDB**: Optimized time-series database for metrics storage
- **Type Safety**: End-to-end TypeScript with Zod validation

## Tech Stack

### Backend
- **Fastify** - Fast and low overhead web framework
- **TypeORM** - ORM with TimescaleDB/PostgreSQL
- **BullMQ** - Redis-based queue system
- **Zod** - Schema validation
- **Lighthouse** - Web performance metrics
- **Pino** - Logging

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **TanStack Router** - Type-safe routing
- **TanStack Query** - Data fetching and caching
- **Tailwind CSS** - Utility-first CSS
- **Radix UI** - Accessible component primitives

### Infrastructure
- **TimescaleDB** - Time-series database (PostgreSQL extension)
- **Redis** - In-memory data store and message broker
- **Docker** - Containerization and deployment
- **Turborepo** - Monorepo build system
- **pnpm** - Fast, disk space efficient package manager

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- Docker and Docker Compose

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd best-lap
```

2. Install dependencies:
```bash
pnpm install
```

3. Create `.env` file in the root directory with required environment variables (see `.env.example`)

4. Start infrastructure services:
```bash
pnpm infra:up
```

5. Run database migrations/seeding:
```bash
pnpm --filter=@best-lap/infra db:seed
```

6. Start development servers:
```bash
pnpm dev
```

### Access Services

- **API**: http://localhost:3333
- **API Docs**: http://localhost:3333/docs
- **Admin Panel**: http://localhost:4000
- **Web Dashboard**: http://localhost:5173
- **TimescaleDB**: localhost:5432
- **Redis**: localhost:6379

## Development Commands

### Core Commands
```bash
pnpm dev              # Start all applications in development mode
pnpm build            # Build all applications and packages
pnpm lint             # Run linting across all packages
pnpm check-types      # Run TypeScript type checking
```

### Infrastructure
```bash
pnpm infra:up         # Start PostgreSQL and Redis in Docker
pnpm infra:down       # Stop infrastructure services
pnpm infra:logs       # View infrastructure services logs
```

### Application-Specific
```bash
turbo dev --filter=api                        # Run only API
turbo dev --filter=metrics-collector          # Run only metrics collector
turbo dev --filter=@best-lap/admin            # Run only admin panel
turbo dev --filter=@best-lap/web              # Run only web dashboard
turbo build --filter=api                      # Build only API
pnpm --filter=@best-lap/metrics-collector collect  # Manual metrics collection
```

### Docker/Production
```bash
pnpm docker:build              # Build all Docker images
pnpm docker:deploy             # Deploy all services (includes web dashboard)
pnpm docker:deploy:ec2         # Deploy to EC2 (backend only, optimized)
pnpm docker:deploy:ec2:rebuild # Deploy to EC2 with forced rebuild
pnpm docker:monitor            # Monitor and troubleshoot containers
```

### EC2-Specific
```bash
pnpm ec2:logs         # View logs from EC2 deployment
pnpm ec2:ps           # Show status of EC2 containers
pnpm ec2:down         # Stop EC2 deployment
```

## Project Documentation

- **CLAUDE.md** - Development commands and architecture guide for AI assistance
- **EC2-DEPLOYMENT.md** - Complete EC2 deployment guide with optimization strategies

## API Structure

The API follows a modular pattern with each module containing:
- `controllers/` - Request handlers with business logic
- `routes.ts` - Route definitions and HTTP method bindings
- `docs/` - Swagger/OpenAPI documentation schemas
- `schemas/` or `utils/` - Zod validation schemas

Example modules:
- `/http/modules/channels` - Channel management
- `/http/modules/pages` - Page configuration
- `/http/modules/metrics` - Performance metrics
- `/http/modules/providers` - Provider management

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript for all new code
3. Add Zod schemas for API validation
4. Update Swagger documentation for API changes
5. Run `pnpm lint` and `pnpm check-types` before committing
6. Test locally with `pnpm dev` before deploying

## License

[Your License Here]
