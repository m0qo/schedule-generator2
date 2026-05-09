# syntax=docker/dockerfile:1.7

# Debian slim images — Prisma's prebuilt engines work out of the box
# (Alpine/musl + OpenSSL 3 was misdetected as openssl-1.1.x and crashed at runtime).

# ---- Stage 1: build client ----
FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Stage 2: build server ----
FROM node:20-slim AS server-build
WORKDIR /app/server
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npx prisma generate && npm run build

# ---- Stage 3: runtime ----
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
RUN npm ci --omit=dev \
 && npx prisma generate \
 && npm cache clean --force

COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist ./public

EXPOSE 8080
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
