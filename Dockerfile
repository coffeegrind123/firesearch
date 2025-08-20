# Multi-stage build for Firesearch Next.js application
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./

# Install specific pnpm version with retry logic to avoid update warnings
RUN for i in 1 2 3; do npm install -g pnpm@10.15.0 && break || sleep 5; done

# Install dependencies with retry logic
RUN for i in 1 2 3; do corepack use pnpm@10.15.0 && pnpm install --frozen-lockfile && break || sleep 5; done

# Approve build scripts to avoid warnings
RUN pnpm approve-builds

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build the application
ENV NEXT_TELEMETRY_DISABLED 1

# Install specific pnpm version and build with retry logic
RUN for i in 1 2 3; do npm install -g pnpm@10.15.0 && break || sleep 5; done && corepack use pnpm@10.15.0 && pnpm build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]