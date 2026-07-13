#!/bin/sh
set -e
npx prisma@6.4.0 db push --schema=/app/packages/db/prisma/schema.prisma --skip-generate --accept-data-loss
exec node apps/server/dist/main
