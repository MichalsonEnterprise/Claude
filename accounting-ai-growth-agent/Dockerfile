FROM node:20-slim AS base
WORKDIR /app

# sharp needs a few native libs on slim images
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8090

CMD ["sh", "-c", "npx prisma migrate deploy && node --enable-source-maps dist/index.js"]
