import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(__dirname, '../public/assets/construmart_coin.png');
const OUT = SRC;

const img = sharp(SRC).ensureAlpha();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

// La imagen viene con un "checker" de transparencia hard-baked (squares grises
// y blancos) porque fue exportada como RGB sin alpha. Detectamos pixeles grises
// (R ≈ G ≈ B y claros) y los volvemos transparentes. La moneda es bronce/dorado
// así que no matchea este filtro.
const { width, height, channels } = info;
for (let i = 0; i < data.length; i += channels) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const maxC = Math.max(r, g, b);
  const minC = Math.min(r, g, b);
  const isGrey = maxC - minC <= 6;
  const isLight = maxC >= 195;
  if (isGrey && isLight) {
    data[i + 3] = 0;
  }
}

await sharp(data, { raw: { width, height, channels } })
  .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9, palette: false })
  .toFile(OUT + '.tmp');

await (await import('node:fs/promises')).rename(OUT + '.tmp', OUT);
const after = await sharp(OUT).metadata();
console.log('optimized →', after.width + 'x' + after.height, 'alpha=' + after.hasAlpha);
