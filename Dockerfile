FROM node:22-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./

RUN npm install -g bun && bun install --frozen-lockfile

COPY . .

RUN bun run build

FROM pierrezemb/gostatic

COPY --from=build /app/dist /srv/http/

CMD ["-port","8080","-fallback","index.html","-https-promote", "-enable-logging"]
