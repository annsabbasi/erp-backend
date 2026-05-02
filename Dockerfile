# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (dev included — needed for NestJS CLI + ts compilation)
RUN npm ci --include=dev

COPY . .

# Compiles TypeScript → dist/ and regenerates Prisma client
RUN npm run build


# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install production deps only, then regenerate Prisma client
RUN npm ci --omit=dev && npx prisma generate

# Copy compiled NestJS output from builder
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

# Cloud Run injects PORT=8080; app falls back to 3070 locally
EXPOSE 8080

CMD ["node", "dist/main"]
