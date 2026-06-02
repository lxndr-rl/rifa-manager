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
RUN apk add --no-cache curl netcat-openbsd
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
COPY wait-for-mysql.sh /wait-for-mysql.sh
RUN chmod +x /wait-for-mysql.sh
CMD ["/wait-for-mysql.sh"]
