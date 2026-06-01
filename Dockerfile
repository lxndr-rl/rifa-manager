FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY src/ ./src/

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app .
RUN mkdir -p /app/data
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/rifas.db
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "src/index.js"]
