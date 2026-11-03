FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate && npm prune --omit=dev

COPY src ./src
EXPOSE 3000
CMD ["node", "src/server.js"]
