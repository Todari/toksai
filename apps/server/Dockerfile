FROM node:22-bookworm-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS build
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml turbo.json ./
COPY packages ./packages
COPY apps/server ./apps/server
RUN pnpm install --frozen-lockfile
# turbo ^build가 shared/db/api를 먼저 빌드(db build는 prisma generate 포함)
RUN pnpm turbo build --filter=@toksai/server

FROM base AS runtime
COPY --from=build /app ./
COPY apps/server/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
ENV NODE_ENV=production
EXPOSE 4100
ENTRYPOINT ["/entrypoint.sh"]
