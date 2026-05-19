FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl g++ gcc python3

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/api ./api
COPY --from=builder /app/public ./public

RUN mkdir -p uploads temp && chmod 777 uploads temp

ENV NODE_ENV=production
ENV PORT=5000
ENV HOST=0.0.0.0

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push --accept-data-loss 2>/dev/null; npx tsx api/server.ts"]
