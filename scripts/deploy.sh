#!/usr/bin/env bash
# Pull → build → rsync a /var/www/construmart (sirve Caddy en este VPS).
# Uso:
#   ./scripts/deploy.sh           # pull + build + deploy
#   ./scripts/deploy.sh --no-pull # solo build + deploy (cambios locales sin pushear)
#   ./scripts/deploy.sh --install # corre `npm ci` antes (si cambió package-lock)
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WEBROOT="/var/www/construmart"

DO_PULL=1
DO_INSTALL=0
for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    --install) DO_INSTALL=1 ;;
    *) echo "Flag desconocida: $arg"; exit 2 ;;
  esac
done

cd "$PROJECT_DIR"

if [[ $DO_PULL -eq 1 ]]; then
  echo "→ git pull --ff-only"
  git pull --ff-only origin main
fi

if [[ $DO_INSTALL -eq 1 ]]; then
  echo "→ npm ci"
  npm ci
fi

echo "→ npm run build"
npm run build

echo "→ rsync dist/ → $WEBROOT/"
sudo rsync -a --delete dist/ "$WEBROOT/"

echo "✓ Deploy OK · https://construmart.uv.agency/"
