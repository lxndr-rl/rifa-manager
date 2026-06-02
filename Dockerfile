FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install
COPY prisma/ ./prisma/
RUN npx prisma generate
COPY src/ ./src/
COPY wait-for-db.js ./

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app .
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000
CMD ["node", "wait-for-db.js"]
