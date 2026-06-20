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

function loadPanorama(sky: HTMLElement, panoramaPath: string): Promise<void> {
  const base = panoramaPath.replace(/\.(jpe?g|png)$/i, '');
  const webp = `${base}.webp`;
  const jpeg = `${base}.jpg`;
  const hires = `${base}.hi.webp`;

  return new Promise((resolve) => {
    // Una vez mostrada la versión estándar, baja la hi-res (resolución nativa) y
    // hace upgrade del sky cuando está lista. Si el preload del home ya la dejó
    // en cache, el swap es instantáneo; si no, se baja en background. Cuando no
    // existe hi-res (.hi.webp 404) simplemente se queda en la estándar.
    const upgradeToHiRes = () => {
      const img = new Image();
      img.onload = () => {
        // El usuario pudo salir del pasillo mientras bajaba: el sky se quita del
        // DOM al cambiar de escena. No hagas el swap si ya no está conectado.
        if (sky.isConnected) sky.setAttribute('src', hires);
      };
      img.src = hires;
    };

    const showStandard = (src: string) => {
      // Reset del color a blanco: si queda el placeholderColor, multiplica la
      // textura y la panorámica se ve teñida (verde/amarilla). El color solo
      // debe verse mientras carga o si la carga falla.
      sky.setAttribute('color', '#FFFFFF');
      sky.setAttribute('src', src);
      resolve();
      upgradeToHiRes();
    };

    const tryFmt = (src: string, onLoad: () => void, onFail: () => void) => {
      const img = new Image();
      img.onload = onLoad;
      img.onerror = onFail;
      img.src = src;
    };

    tryFmt(
      webp,
      () => showStandard(webp),
      () => tryFmt(jpeg, () => showStandard(jpeg), () => resolve()),
    );
  });
}
