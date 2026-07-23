# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# 1) deps — instala dependências isoladamente para aproveitar cache de layers
# ---------------------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* .npmrc ./
# copiado antes do `npm ci` porque o script postinstall roda `prisma generate`,
# que exige o schema presente.
COPY prisma ./prisma
RUN npm ci

# ---------------------------------------------------------------------------
# 2) builder — gera o Prisma Client e o build standalone do Next.js
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ---------------------------------------------------------------------------
# 3) runner — imagem final enxuta, roda como usuário não-root
# ---------------------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs

# Porta interna do container — mapeada para 8080 no host via docker-compose
EXPOSE 3000

CMD ["node", "server.js"]
