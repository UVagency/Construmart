#!/usr/bin/env bash
# Genera los atlas MSDF que consume A-Frame text a partir de las TTF source.
# Llamado desde `npm run gen-fonts`. Si las TTFs no están, corré primero
# `npm run fonts:fetch`.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/scripts/fonts-src"
OUT="$ROOT/public/brand/fonts"
CHARSET="$ROOT/scripts/charset-es.txt"

mkdir -p "$OUT"

gen() {
  local ttf="$1"
  local name="$2"
  npx msdf-bmfont -f xml -i "$CHARSET" -s 42 -m 1024,1024 -t msdf -p 2 \
    -o "$OUT/$name" "$SRC/$ttf"
}

gen BarlowCondensed-Bold.ttf barlow-condensed-bold
gen Inter-Regular.ttf inter-regular
gen Inter-Bold.ttf inter-bold

# msdf-bmfont emite el .fnt con el nombre PascalCase del font-face,
# renombramos a kebab-case para consistencia con los .png.
(cd "$OUT" && \
  [ -f BarlowCondensed-Bold.fnt ] && mv BarlowCondensed-Bold.fnt barlow-condensed-bold.fnt; \
  [ -f Inter-Regular.fnt ] && mv Inter-Regular.fnt inter-regular.fnt; \
  [ -f Inter-Bold.fnt ] && mv Inter-Bold.fnt inter-bold.fnt; true)

echo "Atlas MSDF generados en $OUT"
