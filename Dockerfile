# syntax=docker/dockerfile:1.7

# ---- Stage 1: build client ----
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ---- Stage 2: build server ----
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
RUN npm ci
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npx prisma generate && npm run build

# ---- Stage 3: runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
RUN npm ci --omit=dev \
 && npx prisma generate \
 && npm cache clean --force

COPY --from=server-build /app/server/dist ./dist
COPY --from=client-build /app/client/dist ./public

EXPOSE 8080
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/index.js"]
