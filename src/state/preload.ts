import type { Aisle } from '../types';
import { asset } from '../theme';

export interface PreloadHandle {
  // Resuelve cuando el tier ESTÁNDAR de TODAS las panorámicas terminó de cargar.
  // Es el gate para habilitar la entrada a la experiencia (sin esperas ni
  // placeholders adentro). El hi-res sigue cargando en background, no lo bloquea.
  ready: Promise<void>;
  // Suscribe al progreso de la fase estándar. Llama al callback de inmediato con
  // el valor actual y en cada avance. Devuelve una función para desuscribir.
  subscribe: (cb: (done: number, total: number) => void) => () => void;
}

let handle: PreloadHandle | null = null;

/**
 * Precarga (warm del HTTP cache) las panorámicas en dos fases, una a la vez (no
 * saturar la conexión en sitios de obra):
 *   1. Tier estándar (WebP ~1 MB, fallback JPG) — lo que se muestra al entrar a
 *      cada pasillo. La promesa `ready` resuelve cuando TODAS terminaron: el
 *      splash habilita ENTRAR recién ahí, así adentro no hay esperas.
 *   2. Tier hi-res (`.hi.webp`) — en background tras la fase estándar; el sky
 *      hace upgrade cuando está listo (aisle.ts). No bloquea la entrada.
 * Mismo orden de formatos que aisle.ts: el navegador reusa el archivo cacheado
 * cuando el sky pide el mismo `src`.
 *
 * Idempotente: corre una sola vez por sesión (devuelve siempre el mismo handle).
 */
export function preloadPanoramas(aisles: Aisle[]): PreloadHandle {
  if (handle) return handle;

  const bases = aisles.map((a) => asset(a.panorama).replace(/\.(jpe?g|png)$/i, ''));
  const total = bases.length;
  let done = 0;
  const subs = new Set<(d: number, t: number) => void>();
  const notify = () => subs.forEach((cb) => cb(done, total));

  // Fase estándar, secuencial. `ready` resuelve cuando cargaron todas.
  const ready = (async () => {
    for (const base of bases) {
      await loadStandard(base);
      done += 1;
      notify();
    }
  })();

  // Fase hi-res en background, una vez listo el estándar. No bloquea el gate.
  void ready.then(() => preloadHiRes(bases));

  handle = {
    ready,
    subscribe: (cb) => {
      subs.add(cb);
      cb(done, total); // estado actual de inmediato
      return () => {
        subs.delete(cb);
      };
    },
  };
  return handle;
}

// Carga el tier estándar de una panorámica (webp, fallback jpg). Resuelve SIEMPRE
// (aunque falle) para no trabar el gate por un asset roto o no soportado.
function loadStandard(base: string): Promise<void> {
  return new Promise((resolve) => {
    const webp = new Image();
    webp.onload = () => resolve();
    webp.onerror = () => {
      const jpg = new Image();
      jpg.onload = () => resolve();
      jpg.onerror = () => resolve();
      jpg.src = `${base}.jpg`;
    };
    webp.src = `${base}.webp`;
  });
}

// Baja el tier hi-res en background, secuencial. Sin trabar nada.
function preloadHiRes(bases: string[]): Promise<void> {
  return new Promise((resolve) => {
    let i = 0;
    const next = () => {
      if (i >= bases.length) {
        resolve();
        return;
      }
      const img = new Image();
      img.onload = next;
      img.onerror = next; // sin hi-res: seguir igual
      img.src = `${bases[i++]}.hi.webp`;
    };
    next();
  });
}
