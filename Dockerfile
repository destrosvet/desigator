# ============================================
# BUILD STAGE
# ============================================
FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS builder

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
FROM node:22-alpine@sha256:fe4f6d74e20370acb04ad889077d14d0f64a9c8ea6a42bc60cddf1e844699914 AS runner

WORKDIR /app

# Prisma engine pro PostgreSQL
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/prisma ./prisma

# Next.js standalone output + public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# Scripts
COPY --from=builder --chown=node:node /app/package.json ./
COPY --from=builder --chown=node:node /app/scripts/check-deployment.mjs /app/scripts/check-migration-safety.mjs ./scripts/

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

# Entrypoint pro Prisma migrate
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

USER node
ENTRYPOINT ["docker-entrypoint.sh"]
