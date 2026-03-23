FROM node:20-alpine AS base
RUN npm install -g pnpm
WORKDIR /app
COPY package.json ./
COPY prisma ./prisma/

# ── Development ──────────────────────────────────────────────
FROM base AS development
RUN pnpm install
COPY . .
EXPOSE 3001
CMD ["pnpm", "dev"]

# ── Builder ──────────────────────────────────────────────────
FROM base AS builder
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

# ── Production ───────────────────────────────────────────────
FROM node:20-alpine AS production
RUN npm install -g pnpm
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./
EXPOSE 3001
CMD ["node", "dist/app.js"]
