FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY lib/ ./lib/
RUN npm ci

COPY webapp/ ./webapp/
COPY server.js ./

EXPOSE 8080

CMD ["node", "server.js"]
