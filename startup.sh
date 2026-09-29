#!/bin/sh
# YieldTruth V1 production restart contract.
#
# Root cause this guards against: on 2026-09-29 production served 502 because the
# `yieldtruth` PM2 app was absent from the PM2 registry and 127.0.0.1:4330 was closed.
# This script is idempotent and non-blocking: it probes, starts only what is down,
# and returns fast so a reboot/revive converges on a serving production.
set -eu

ROOT=/root/YieldTruth
PM2="npx --no-install pm2"
UPSTREAM=http://127.0.0.1:4330/
PUBLIC=https://yieldtruth.bydx.fun/api/v1/health/live

cd "$ROOT"

# 1. nginx must be serving the TLS vhost that proxies to 4330.
if ! systemctl is-active --quiet nginx 2>/dev/null; then
  systemctl start nginx || true
fi

# 2. Database.
if ! systemctl is-active --quiet postgresql 2>/dev/null; then
  systemctl start postgresql || true
fi

# 3. Application. Probe the upstream, not just the process table: a live PM2
#    process with a dead listener is still an outage.
if curl -sf -o /dev/null --max-time 5 "$UPSTREAM"; then
  :
else
  # Not serving. Make sure the app is registered, then (re)start it.
  if ! $PM2 describe yieldtruth >/dev/null 2>&1; then
    $PM2 start "$ROOT/ecosystem.config.cjs" >/dev/null 2>&1 || true
  fi
  $PM2 restart yieldtruth --update-env >/dev/null 2>&1 || $PM2 start ecosystem.config.cjs >/dev/null 2>&1 || true
fi

# 4. Persist the process list so the next boot resurrects it instead of losing it.
$PM2 save >/dev/null 2>&1 || true

# 5. Report only; never fail the script on a slow TLS handshake during boot.
if curl -sf -o /dev/null --max-time 20 "$PUBLIC"; then
  echo "yieldtruth: production live"
else
  echo "yieldtruth: upstream started, public check not yet green" >&2
fi

exit 0
