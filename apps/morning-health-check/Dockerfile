FROM node:20-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY frontend/package.json frontend/
RUN cd frontend && pnpm install --frozen-lockfile 2>/dev/null || cd frontend && pnpm install

COPY . .
RUN cd frontend && pnpm run build

EXPOSE 8095

CMD ["node", "server.js"]
