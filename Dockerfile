# syntax=docker/dockerfile:1
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json bun.lock ./

RUN npm install -g bun && bun install --frozen-lockfile

COPY . .

# Build-time VITE_* vars are supplied via a Fly/BuildKit build secret rather than
# copied into the image. The secret is mounted only for this RUN and never
# persisted to a layer. Deploy with:
#   fly deploy --build-secret vite_env="$(cat .env.local)"
RUN --mount=type=secret,id=vite_env \
    if [ ! -f /run/secrets/vite_env ]; then \
      echo "ERROR: missing build secret 'vite_env'. Deploy with: fly deploy --build-secret vite_env=\"\$(cat .env.local)\"" >&2; \
      exit 1; \
    fi; \
    cp /run/secrets/vite_env .env.production.local && \
    bun run build && \
    rm -f .env.production.local

FROM pierrezemb/gostatic

COPY --from=build /app/dist /srv/http/

CMD ["-port","8080","-fallback","index.html","-https-promote", "-enable-logging"]
