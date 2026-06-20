/**
 * Pipeline de optimización de panorámicas 360°.
 *
 * Toma equirectangulares crudos del directorio panoramas/raw/ y genera
 * versiones optimizadas en public/panoramas/ — JPEG (universal) + WebP
 * (más liviano, ~30% menos peso, soportado por el browser del Quest 2).
 *
 * También genera un placeholder de baja resolución para carga progresiva y,
 * cuando el crudo lo permite, un tier de alta resolución `{nombre}.hi.webp`
 * (resolución nativa, cap 8192) que la app baja en segundo plano para hacer
 * upgrade del sky una vez que la versión estándar ya se mostró.
 *
 * Uso:
 *   npm run optimize            — calidad de producción (recomendado)
 *   npm run optimize:lossless   — máxima calidad, solo para QA visual
 */

import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';

const INPUT_DIR = 'panoramas/raw';
const OUTPUT_DIR = 'public/panoramas';
const PLACEHOLDER_DIR = 'public/panoramas/lowres';

const TARGET_WIDTH = 4096;
const PLACEHOLDER_WIDTH = 512;

// Tier de alta resolución: ancho nativo del crudo, cap a 8192 (MAX_TEXTURE_SIZE
// seguro en el browser del Quest 2). Solo se emite si supera TARGET_WIDTH —
// para fuentes ≤4096 sería idéntico al estándar y no aporta.
const HIRES_MAX_WIDTH = 8192;

const JPEG_QUALITY = 82;
const WEBP_QUALITY = 78;
const HIRES_WEBP_QUALITY = 82;
const JPEG_QUALITY_LOSSLESS = 95;
const WEBP_QUALITY_LOSSLESS = 95;

const SIZE_BUDGET_MB = 2;
const HIRES_BUDGET_MB = 3;

const lossless = process.argv.includes('--lossless');
const jpegQ = lossless ? JPEG_QUALITY_LOSSLESS : JPEG_QUALITY;
const webpQ = lossless ? WEBP_QUALITY_LOSSLESS : WEBP_QUALITY;
const hiresQ = lossless ? WEBP_QUALITY_LOSSLESS : HIRES_WEBP_QUALITY;

interface Result {
  file: string;
  rawBytes: number;
  rawDims: string;
  jpegBytes: number;
  webpBytes: number;
  hiresBytes: number; // 0 si el crudo no supera TARGET_WIDTH (no se emite hi-res)
  hiresDims: string;
  placeholderBytes: number;
}

function fmtMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

function fmtKB(bytes: number): string {
  return (bytes / 1024).toFixed(0) + ' kB';
}

async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

async function processFile(filename: string): Promise<Result | null> {
  const inputPath = path.join(INPUT_DIR, filename);
  const stat = await fs.stat(inputPath);
  if (!stat.isFile()) return null;

  const base = path.basename(filename, path.extname(filename));
  const meta = await sharp(inputPath).metadata();

  if (!meta.width || !meta.height) {
    throw new Error('no se pudo leer metadata');
  }

  const aspect = meta.width / meta.height;
  if (Math.abs(aspect - 2) > 0.05) {
    console.log(
      `\n  ⚠  aspect ${aspect.toFixed(2)} ≠ 2:1 — ¿es equirectangular? Continúo de todos modos.`,
    );
  }

  const targetWidth = Math.min(meta.width, TARGET_WIDTH);
  const targetHeight = Math.round(targetWidth / 2);

  const jpegPath = path.join(OUTPUT_DIR, `${base}.jpg`);
  await sharp(inputPath)
    .resize(targetWidth, targetHeight, { fit: 'fill', kernel: 'lanczos3' })
    .jpeg({ quality: jpegQ, mozjpeg: true, progressive: true })
    .toFile(jpegPath);
  const jpegStat = await fs.stat(jpegPath);

  const webpPath = path.join(OUTPUT_DIR, `${base}.webp`);
  await sharp(inputPath)
    .resize(targetWidth, targetHeight, { fit: 'fill', kernel: 'lanczos3' })
    .webp({ quality: webpQ, effort: 5 })
    .toFile(webpPath);
  const webpStat = await fs.stat(webpPath);

  // Tier hi-res: solo cuando el crudo supera el ancho estándar. La app lo baja
  // en background y hace upgrade del sky tras mostrar el estándar.
  const hiresWidth = Math.min(meta.width, HIRES_MAX_WIDTH);
  let hiresBytes = 0;
  let hiresDims = '—';
  if (hiresWidth > TARGET_WIDTH) {
    const hiresHeight = Math.round(hiresWidth / 2);
    const hiresPath = path.join(OUTPUT_DIR, `${base}.hi.webp`);
    await sharp(inputPath)
      .resize(hiresWidth, hiresHeight, { fit: 'fill', kernel: 'lanczos3' })
      .webp({ quality: hiresQ, effort: 5 })
      .toFile(hiresPath);
    hiresBytes = (await fs.stat(hiresPath)).size;
    hiresDims = `${hiresWidth}×${hiresHeight}`;
  }

  const placeholderPath = path.join(PLACEHOLDER_DIR, `${base}.jpg`);
  await sharp(inputPath)
    .resize(PLACEHOLDER_WIDTH, PLACEHOLDER_WIDTH / 2, { fit: 'fill' })
    .jpeg({ quality: 60, mozjpeg: true })
    .toFile(placeholderPath);
  const placeholderStat = await fs.stat(placeholderPath);

  return {
    file: filename,
    rawBytes: stat.size,
    rawDims: `${meta.width}×${meta.height}`,
    jpegBytes: jpegStat.size,
    webpBytes: webpStat.size,
    hiresBytes,
    hiresDims,
    placeholderBytes: placeholderStat.size,
  };
}

async function main() {
  await ensureDir(OUTPUT_DIR);
  await ensureDir(PLACEHOLDER_DIR);

  let files: string[];
  try {
    files = await fs.readdir(INPUT_DIR);
  } catch {
    console.error(`No existe ${INPUT_DIR}/`);
    console.error('Crea el directorio y coloca ahí las panorámicas crudas del shoot.');
    console.error('Esperado: archivos JPG/PNG equirectangulares (2:1) — uno por pasillo.');
    process.exit(1);
  }

  const images = files.filter((f) => /\.(jpe?g|png|tiff?)$/i.test(f) && !f.startsWith('.'));
  if (images.length === 0) {
    console.error(`No hay imágenes en ${INPUT_DIR}/`);
    process.exit(1);
  }

  console.log(
    `\nOptimizando ${images.length} panorámica(s) → ${TARGET_WIDTH}×${TARGET_WIDTH / 2}`,
  );
  console.log(`Calidad: JPEG=${jpegQ} / WebP=${webpQ}${lossless ? '  (modo lossless)' : ''}\n`);

  const results: Result[] = [];
  for (const f of images) {
    process.stdout.write(`  ${f.padEnd(28)} ... `);
    try {
      const r = await processFile(f);
      if (r) {
        results.push(r);
        console.log('✓');
      }
    } catch (err) {
      console.log(`✗  ${(err as Error).message}`);
    }
  }

  if (results.length === 0) return;

  console.log(
    '\n┌──────────────────────────────┬─────────────┬───────────┬───────────┬───────────┬─────────┐',
  );
  console.log(
    '│ Archivo                      │ Crudo       │ JPEG      │ WebP      │ HiRes     │ Lowres  │',
  );
  console.log(
    '├──────────────────────────────┼─────────────┼───────────┼───────────┼───────────┼─────────┤',
  );
  for (const r of results) {
    const overBudget = r.webpBytes / 1024 / 1024 > SIZE_BUDGET_MB ? ' ⚠' : '  ';
    const hiresOver = r.hiresBytes / 1024 / 1024 > HIRES_BUDGET_MB ? ' ⚠' : '  ';
    const hiresCell = r.hiresBytes
      ? `${fmtMB(r.hiresBytes).padStart(7)}${hiresOver}`
      : `${'—'.padStart(7)}  `;
    const name = r.file.padEnd(28);
    console.log(
      `│ ${name} │ ${fmtMB(r.rawBytes).padStart(11)} │ ${fmtMB(r.jpegBytes).padStart(9)} │ ${fmtMB(r.webpBytes).padStart(7)}${overBudget} │ ${hiresCell} │ ${fmtKB(r.placeholderBytes).padStart(7)} │`,
    );
  }
  console.log(
    '└──────────────────────────────┴─────────────┴───────────┴───────────┴───────────┴─────────┘',
  );

  const totalRaw = results.reduce((s, r) => s + r.rawBytes, 0);
  const totalJpeg = results.reduce((s, r) => s + r.jpegBytes, 0);
  const totalWebp = results.reduce((s, r) => s + r.webpBytes, 0);
  const totalHires = results.reduce((s, r) => s + r.hiresBytes, 0);
  console.log(
    `\nTotal crudo:  ${fmtMB(totalRaw).padStart(10)}`,
  );
  console.log(
    `Total JPEG:   ${fmtMB(totalJpeg).padStart(10)}   (${((1 - totalJpeg / totalRaw) * 100).toFixed(0)}% menos)`,
  );
  console.log(
    `Total WebP:   ${fmtMB(totalWebp).padStart(10)}   (${((1 - totalWebp / totalRaw) * 100).toFixed(0)}% menos)`,
  );
  if (totalHires > 0) {
    console.log(
      `Total HiRes:  ${fmtMB(totalHires).padStart(10)}   (background upgrade, cacheado)`,
    );
  }

  const overBudgetCount = results.filter(
    (r) => r.webpBytes / 1024 / 1024 > SIZE_BUDGET_MB,
  ).length;
  if (overBudgetCount > 0) {
    console.log(
      `\n⚠  ${overBudgetCount} panorámica(s) sobre el presupuesto de ${SIZE_BUDGET_MB} MB en WebP.`,
    );
    console.log('   Opciones: bajar TARGET_WIDTH a 2048, bajar WEBP_QUALITY, o tilear en cube map.');
  } else {
    console.log(`\n✓  Todas las panorámicas dentro del presupuesto de ${SIZE_BUDGET_MB} MB.`);
  }

  const hiresOverCount = results.filter(
    (r) => r.hiresBytes / 1024 / 1024 > HIRES_BUDGET_MB,
  ).length;
  if (hiresOverCount > 0) {
    console.log(
      `⚠  ${hiresOverCount} hi-res sobre el presupuesto de ${HIRES_BUDGET_MB} MB — considerá bajar HIRES_WEBP_QUALITY.`,
    );
  }
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
