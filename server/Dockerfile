FROM node:18-slim

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY prisma ./prisma
ENV PRISMA_ENGINES_MIRROR=https://binaries.prisma.sh
RUN npx prisma generate

COPY src ./src

ENV NODE_ENV=production

CMD ["node", "src/index.js"]
