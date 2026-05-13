#!/usr/bin/env bash
# Despliega construmart.uv.agency: pull → build → sync a /var/www/construmart
# Servido por Caddy desde /var/www/construmart (ver /etc/caddy/Caddyfile).
set -euo pipefail

REPO_DIR="/home/ubuntu/Construmart"
SERVE_DIR="/var/www/construmart"
BRANCH="main"

cd "$REPO_DIR"

echo "==> git pull origin $BRANCH"
git fetch origin "$BRANCH"
BEFORE="$(git rev-parse HEAD)"
git pull --ff-only origin "$BRANCH"
AFTER="$(git rev-parse HEAD)"

if [ "$BEFORE" = "$AFTER" ] && [ "${FORCE:-0}" != "1" ] && [ -d "$SERVE_DIR" ]; then
  echo "==> Sin cambios ($AFTER). Usa FORCE=1 ./deploy.sh para forzar rebuild."
  exit 0
fi

if git diff --name-only "$BEFORE" "$AFTER" | grep -qE '^(package\.json|package-lock\.json)$' || [ ! -d node_modules ]; then
  echo "==> npm ci"
  npm ci
else
  echo "==> deps sin cambios, skip npm ci"
fi

echo "==> npm run build"
npm run build

echo "==> rsync dist/ -> $SERVE_DIR/"
rsync -a --delete dist/ "$SERVE_DIR/"

echo "==> OK. Commit servido: $AFTER"
