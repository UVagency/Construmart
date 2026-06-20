import type { Aisle } from '../types';
import { asset } from '../theme';

let started = false;

/**
 * Precarga (warm del HTTP cache) las panorámicas de todos los pasillos en
 * segundo plano, mientras el usuario está en el home. Así, al entrar a un
 * pasillo, la 360° ya está en cache y aparece al instante — clave con la
 * conectividad mala de los sitios de obra.
 *
 * Se baja una a la vez (no en paralelo) para no saturar la conexión, en dos
 * pasadas:
 *   1. Tier estándar (WebP ~1 MB, fallback JPG) — lo que se muestra al instante
 *      al entrar al pasillo. Prioritario.
 *   2. Tier hi-res (`.hi.webp` ~2 MB) — para el upgrade en background del sky y
 *      para que quede en el cache HTTP del visor para el próximo usuario.
 * Mismo orden de formatos que aisle.ts (`tryLoadPanorama`): el navegador reusa
 * el archivo cacheado cuando el sky pide el mismo `src`.
 *
 * Idempotente: corre una sola vez por sesión.
 */
export function preloadPanoramas(aisles: Aisle[]): void {
  if (started) return;
  started = true;

  const bases = aisles.map((a) => asset(a.panorama).replace(/\.(jpe?g|png)$/i, ''));
  let hiresPhase = false;
  let i = 0;

  const next = () => {
    if (i >= bases.length) {
      if (hiresPhase) return; // terminaron las dos pasadas
      hiresPhase = true; // pasa al tier hi-res
      i = 0;
    }
    const base = bases[i++];

    if (hiresPhase) {
      const img = new Image();
      img.onload = next;
      img.onerror = next; // sin hi-res: seguir igual
      img.src = `${base}.hi.webp`;
      return;
    }

    const img = new Image();
    img.onload = next;
    img.onerror = () => {
      // WebP falló (o no soportado): intenta el JPG y, pase lo que pase,
      // sigue con la siguiente panorámica.
      const fallback = new Image();
      fallback.onload = next;
      fallback.onerror = next;
      fallback.src = `${base}.jpg`;
    };
    img.src = `${base}.webp`;
  };

  next();
}
