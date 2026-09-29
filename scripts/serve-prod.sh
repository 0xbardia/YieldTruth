#!/bin/sh
# Production entrypoint for YieldTruth (PM2-managed, single fork instance).
#
# Sources .env so database credentials live only in .env (mode 0600), never in the
# process-manager config. Every path is derived from this script's location, and the
# Node binary is resolved from PATH, so a checkout works from any directory.
set -eu

APP_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$APP_DIR"

if [ ! -f "$APP_DIR/.env" ]; then
  echo "serve-prod: $APP_DIR/.env is missing; copy .env.example and fill it in" >&2
  exit 1
fi

set -a
. "$APP_DIR/.env"
set +a

# The backend is loopback-only. TLS termination and the public vhost belong to the
# reverse proxy, which is the only thing that should reach this port.
HOST=${API_HOST:-127.0.0.1}
PORT=${API_PORT:-4330}

exec node \
  "$APP_DIR/node_modules/srvx/bin/srvx.mjs" \
  serve --prod --host "$HOST" --port "$PORT" \
  --static "$APP_DIR/.vercel/output/static" \
  --entry "$APP_DIR/.vercel/output/functions/__server.func/index.mjs"
