#!/usr/bin/env bash
# Baja las TTF source de Google Fonts (licencia OFL) a scripts/fonts-src/.
# Llamado desde `npm run fonts:fetch`. Después correr `npm run gen-fonts`.
set -euo pipefail

DEST="$(cd "$(dirname "$0")" && pwd)/fonts-src"
mkdir -p "$DEST"

# Barlow Condensed Bold viene del repo principal de Google Fonts.
curl -sL -o "$DEST/BarlowCondensed-Bold.ttf" \
  "https://github.com/google/fonts/raw/main/ofl/barlowcondensed/BarlowCondensed-Bold.ttf"

# Inter ya solo está como variable font en google/fonts; las versiones
# estáticas viven en el CDN de fontsource.
curl -sL -o "$DEST/Inter-Regular.ttf" \
  "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf"
curl -sL -o "$DEST/Inter-Bold.ttf" \
  "https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf"

echo "Done. TTFs en $DEST"
