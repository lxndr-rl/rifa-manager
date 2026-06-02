FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY prisma/ ./prisma/
RUN npx prisma generate
COPY src/ ./src/

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app .
RUN apk add --no-cache mariadb-client curl
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
  CMD curl -f http://localhost:3000/ || exit 1
CMD ["sh", "-c", "until mysqladmin ping -h mysql -u root -p'RifaP@ssw0rd2024!' --silent; do echo 'Waiting for MySQL...'; sleep 2; done && npx prisma migrate deploy && node prisma/seed.js && node src/index.js"]
