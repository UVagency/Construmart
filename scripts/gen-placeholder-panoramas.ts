/**
 * Placeholders 360° para los 6 pasillos.
 *
 * Cada uno es una equirectangular sintética 2048×1024 (ratio 2:1) construida
 * con SVG → sharp → JPG + WebP. El nombre del aisle se repite en los 4 puntos
 * cardinales del ecuador para que sea visible desde cualquier orientación del
 * headset. El `placeholderColor` viene de src/data/aisles.json — el mismo
 * que aplica el <a-sky> mientras la textura todavía carga.
 *
 * Cuando llegue el shoot 360° real (25-26 May según brief), reemplazar
 * los archivos en public/panoramas/{id}.jpg y .webp con el output del
 * pipeline optimize-panoramas. El código del aisle no necesita cambiar.
 */
import sharp from 'sharp';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const AISLES_JSON = path.join(ROOT, 'src/data/aisles.json');
const OUT_DIR = path.join(ROOT, 'public/panoramas');

const W = 2048;
const H = 1024;

interface Aisle {
  id: string;
  name: string;
  placeholderColor: string;
}

async function main() {
  const raw = await fs.readFile(AISLES_JSON, 'utf-8');
  const data = JSON.parse(raw) as { aisles: Aisle[] };
  await fs.mkdir(OUT_DIR, { recursive: true });

  for (const aisle of data.aisles) {
    const svg = buildSvg(aisle);
    const buf = Buffer.from(svg);

    const jpg = path.join(OUT_DIR, `${aisle.id}.jpg`);
    const webp = path.join(OUT_DIR, `${aisle.id}.webp`);

    await sharp(buf, { density: 72 })
      .jpeg({ quality: 78, progressive: true })
      .toFile(jpg);
    await sharp(buf, { density: 72 })
      .webp({ quality: 72 })
      .toFile(webp);

    console.log(`✓ ${aisle.id} → ${path.relative(ROOT, jpg)} + .webp`);
  }
}

function buildSvg(aisle: Aisle): string {
  const c = aisle.placeholderColor;
  const name = aisle.name.toUpperCase();
  // 4 puntos cardinales en el ecuador horizontal — 25% / 50% / 75% / 100% del
  // ancho equivalen a frente, derecha, atrás, izquierda en el equirectangular.
  const cardinals = [0.125, 0.375, 0.625, 0.875];

  const labels = cardinals
    .map((p) => {
      const x = Math.round(W * p);
      const y = Math.round(H * 0.5);
      return `
        <g>
          <text x="${x}" y="${y - 20}" text-anchor="middle" font-family="Inter, system-ui, sans-serif"
            font-weight="800" font-size="110" fill="#FFFFFF" letter-spacing="2">${escapeXml(name)}</text>
          <text x="${x}" y="${y + 50}" text-anchor="middle" font-family="Inter, system-ui, sans-serif"
            font-weight="600" font-size="26" fill="#FFB81C" letter-spacing="10">PASILLO 360°</text>
          <text x="${x}" y="${y + 95}" text-anchor="middle" font-family="Inter, system-ui, sans-serif"
            font-weight="400" font-size="22" fill="#9CA3AF" letter-spacing="6">PLACEHOLDER · CONSTRUMART ARICA</text>
        </g>`;
    })
    .join('');

  // Gradient vertical: oscuro arriba (cielo) → color del aisle al ecuador →
  // navy abajo (piso). Visualmente da sensación de "espacio interior".
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0a0f1a"/>
        <stop offset="35%" stop-color="${c}"/>
        <stop offset="65%" stop-color="${c}"/>
        <stop offset="100%" stop-color="#041E42"/>
      </linearGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <!-- Líneas guía sutiles en el ecuador para reforzar la sensación de "ring 360°" -->
    <line x1="0" y1="${H * 0.5}" x2="${W}" y2="${H * 0.5}" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="2"/>
    ${labels}
  </svg>`;
}

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    '"': '&quot;',
    "'": '&apos;',
  }[c]!));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
