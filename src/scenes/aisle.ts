import type { Aisle } from '../types';
import { asset } from '../theme';
import { buildNavMenu, buildNextButton, buildPrevButton, buildHeadingTuner } from './navmenu';

// Calibrador de heading activo sólo con `?tune` en la URL (dev/QA).
function tuneEnabled(): boolean {
  try {
    return new URLSearchParams(window.location.search).has('tune');
  } catch {
    return false;
  }
}

export interface AisleCallbacks {
  // Salir del recorrido (al splash, o a la credencial si está completo).
  onBack: () => void;
  // Navegación de recorrido: salta directo al pasillo anterior/siguiente.
  // `undefined` cuando no hay pasillo en esa dirección.
  onPrev?: () => void;
  prevName?: string;
  onNext?: () => void;
  nextName?: string;
  // En el último pasillo con el recorrido completo, "siguiente" se convierte en
  // el CTA de finalización (felicitaciones → pantalla final).
  nextIsFinish?: boolean;
  // Accesos directos del menú desplegable (los 6 pasillos).
  aisles: { id: string; name: string }[];
  currentId: string;
  isVisited: (id: string) => boolean;
  onSelect: (id: string) => void;
}

export function renderAisle(root: HTMLElement, aisle: Aisle, cb: AisleCallbacks) {
  const { sky } = createAisleSky(aisle);
  root.appendChild(sky);
  buildAisleHuds(root, cb);
}

// Crea el <a-sky> del pasillo y arranca la carga progresiva de la panorámica.
// `ready` resuelve cuando la versión estándar quedó pintada (o si falló del
// todo) — la transición glide lo usa para no disolver mientras aún se ve el
// placeholderColor.
export function createAisleSky(aisle: Aisle): { sky: HTMLElement; ready: Promise<void> } {
  const sky = document.createElement('a-sky');
  sky.setAttribute('color', aisle.placeholderColor);
  // Rotación inicial para dejar el corredor del pasillo de frente (-Z). El
  // efecto de vuelo hace dolly sobre Z, así que con el corredor en -Z se siente
  // como caminar por el pasillo y no entrar de cara a una góndola.
  sky.setAttribute('rotation', `0 ${aisle.heading ?? 0} 0`);
  const ready = loadPanorama(sky, asset(aisle.panorama));
  return { sky, ready };
}

// HUDs del pasillo en world-space (para que el reticle gaze pueda fijarlos):
//   - Cluster de la C (accesos directos + salir): abajo-al-frente.
//   - SIGUIENTE: arriba-al-frente (mirar un poco hacia arriba).
//   - ANTERIOR: a las espaldas (darse vuelta para elegirlo).
export function buildAisleHuds(root: HTMLElement, cb: AisleCallbacks) {
  root.appendChild(
    buildNavMenu({
      aisles: cb.aisles,
      currentId: cb.currentId,
      isVisited: cb.isVisited,
      onSelect: cb.onSelect,
      onExit: cb.onBack,
    }),
  );

  if (cb.onNext) {
    root.appendChild(buildNextButton(cb.nextName, !!cb.nextIsFinish, cb.onNext));
  }
  if (cb.onPrev) {
    root.appendChild(buildPrevButton(cb.prevName, cb.onPrev));
  }

  if (tuneEnabled()) root.appendChild(buildHeadingTuner());
}

// Devuelve la ruta del tier de baja resolución (public/panoramas/lowres/<id>.jpg)
// a partir de la ruta base sin extensión (.../panoramas/<id>).
export function lowresOf(base: string): string {
  return base.replace(/\/([^/]+)$/, '/lowres/$1.jpg');
}

function loadPanorama(sky: HTMLElement, panoramaPath: string): Promise<void> {
  const base = panoramaPath.replace(/\.(jpe?g|png)$/i, '');
  const lowres = lowresOf(base);
  const webp = `${base}.webp`;
  const jpeg = `${base}.jpg`;
  const hires = `${base}.hi.webp`;

  // Aplica `src` al sky y resuelve cuando la textura está REALMENTE subida a la
  // GPU (evento materialtextureloaded) — no al setear el src. Devuelve false si
  // el archivo no existe (404), detectado con un probe previo, para no romper el
  // material con un src inválido. Con red de seguridad por timeout.
  const applyTier = (src: string): Promise<boolean> =>
    new Promise((res) => {
      let settled = false;
      const done = (ok: boolean) => {
        if (settled) return;
        settled = true;
        res(ok);
      };
      const probe = new Image();
      probe.onload = () => {
        sky.addEventListener(
          'materialtextureloaded',
          () => {
            sky.setAttribute('color', '#FFFFFF'); // con textura: sin tinte
            done(true);
          },
          { once: true },
        );
        sky.setAttribute('src', src);
        setTimeout(() => done(true), 4000); // red de seguridad
      };
      probe.onerror = () => done(false); // 404: tier inexistente, se salta
      probe.src = src;
    });

  return new Promise((resolveReady) => {
    let ready = false;
    const markReady = () => {
      if (!ready) {
        ready = true;
        resolveReady();
      }
    };

    // Carga progresiva en 3 tiers. La baja resolución (chica) sube a la GPU casi
    // al instante, así al entrar al pasillo se ve la imagen (borrosa) en vez de
    // un color sólido; luego se reemplaza por la estándar y por la hi-res. La
    // transición arranca (`ready`) con el primer tier visible.
    void (async () => {
      if (await applyTier(lowres)) markReady();
      const std = (await applyTier(webp)) || (await applyTier(jpeg));
      markReady(); // si no hubo lowres, igual arrancamos con la estándar
      if (std) await applyTier(hires);
    })();
  });
}
