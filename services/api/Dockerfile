FROM node:20-slim AS base
WORKDIR /repo
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json ./
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/geo/package.json packages/geo/package.json
COPY services/api/package.json services/api/package.json
RUN pnpm install --frozen-lockfile=false

FROM deps AS build
COPY packages ./packages
COPY services/api ./services/api
COPY infra/migrations ./infra/migrations
RUN pnpm --filter @parkvision/api... run build

FROM node:20-slim AS runtime
WORKDIR /repo
RUN corepack enable
COPY --from=build /repo /repo
WORKDIR /repo/services/api
ENV NODE_ENV=production
EXPOSE 3001
CMD ["sh", "-c", "node dist/migrate.js && node dist/index.js"]
