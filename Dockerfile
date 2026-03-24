FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
COPY dashboard/package.json dashboard/
COPY memory/package.json memory/
RUN npm ci --ignore-scripts

# Build dashboard
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/dashboard/node_modules ./dashboard/node_modules
COPY --from=deps /app/memory/node_modules ./memory/node_modules
COPY . .
RUN cd dashboard && npm run build

# Production
FROM base AS runner
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder /app/dashboard/.next/standalone ./
COPY --from=builder /app/dashboard/.next/static ./dashboard/.next/static
COPY --from=builder /app/dashboard/public ./dashboard/public
USER nextjs
EXPOSE 3333
ENV PORT=3333
CMD ["node", "dashboard/server.js"]
