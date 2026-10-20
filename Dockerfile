# ============================================
# BUILD STAGE
# ============================================
FROM node:22-alpine AS builder

WORKDIR /app

# Dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Prisma schema a generování klienta
COPY prisma ./prisma/
RUN npx prisma generate

# Zbytek zdrojáků
COPY . .

# Build Next.js standalone
RUN npm run build

# Keep the complete production dependency tree, including Prisma CLI dependencies.
RUN npm prune --omit=dev --ignore-scripts

# ============================================
# PRODUCTION STAGE
# ============================================
FROM node:22-alpine AS runner

WORKDIR /app

# Prisma engine pro PostgreSQL
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

# Next.js standalone output + public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Scripts
COPY --from=builder /app/package.json ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Entrypoint pro Prisma migrate
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

ENTRYPOINT ["docker-entrypoint.sh"]
