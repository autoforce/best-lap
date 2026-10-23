# Dockerfile for API application
# Multi-stage build optimized for EC2 instances

# Stage 1: Dependencies
FROM node:22-alpine AS deps
RUN npm install -g pnpm@8.14.0
WORKDIR /app

# Copy only lock files and package.json files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/env/package.json ./packages/env/
COPY packages/infra/package.json ./packages/infra/
COPY config/eslint-config/package.json ./config/eslint-config/
COPY config/prettier/package.json ./config/prettier/
COPY config/typescript-config/package.json ./config/typescript-config/
COPY apps/api/package.json ./apps/api/

# Install dependencies - layer will be cached unless lockfile changes
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM node:22-alpine AS builder
RUN npm install -g pnpm@8.14.0
WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=deps /app/pnpm-lock.yaml ./pnpm-lock.yaml
COPY --from=deps /app/turbo.json ./turbo.json

# Copy workspace package node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/env/node_modules ./packages/env/node_modules
COPY --from=deps /app/packages/infra/node_modules ./packages/infra/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules

# Copy source code
COPY packages/ ./packages/
COPY config/ ./config/
COPY apps/api/ ./apps/api/

# Build only the API and required dependencies
RUN pnpm build --filter=@best-lap/api

# Stage 3: Production runtime
FROM node:22-alpine AS runner
RUN npm install -g pnpm@8.14.0

# Create app user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

WORKDIR /app

# Copy package files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY turbo.json ./

# Copy package.json for workspace packages
COPY --from=builder /app/packages/core/package.json ./packages/core/package.json
COPY --from=builder /app/packages/env/package.json ./packages/env/package.json
COPY --from=builder /app/packages/infra/package.json ./packages/infra/package.json
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy node_modules from builder (including workspace links)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=builder /app/packages/env/node_modules ./packages/env/node_modules
COPY --from=builder /app/packages/infra/node_modules ./packages/infra/node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copy built artifacts from builder
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/env/dist ./packages/env/dist
COPY --from=builder /app/packages/infra/dist ./packages/infra/dist
COPY --from=builder /app/apps/api/dist ./apps/api/dist

# Change ownership
RUN chown -R appuser:nodejs /app

USER appuser

EXPOSE 3333

# Optimized health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http=require('http');http.get('http://localhost:3333/health',(r)=>{process.exit(r.statusCode===200?0:1)}).on('error',()=>{process.exit(1)})"

CMD ["node", "apps/api/dist/server.js"]