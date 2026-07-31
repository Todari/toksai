#!/bin/sh
set -e

/app/packages/db/node_modules/.bin/prisma migrate deploy \
  --schema=/app/packages/db/prisma/schema.prisma

exec node apps/server/dist/main
