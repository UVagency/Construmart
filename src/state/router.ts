import aislesDataRaw from '../data/aisles.json';
import type { AislesData } from '../types';
import { renderFacade } from '../scenes/facade';
import { renderAisle, createAisleSky, buildAisleHuds, type AisleCallbacks } from '../scenes/aisle';
import { renderCredential } from '../scenes/credential';
import { progress } from './progress';
import { fadeIn, fadeOut, flyThrough } from './transition';
import { setLookControlsEnabled, resetLookOrientation } from './camera';
import { preloadPanoramas } from './preload';
import { track } from './analytics';

const data = aislesDataRaw as AislesData;
const ROOT_ID = 'scene-root';
// Radio al que se achican AMBOS cielos durante el "vuelo" entre pasillos: con
// la cámara centrada el radio no cambia NADA visual, pero al desplazar las
// esferas un radio chico amplifica el flujo óptico = se siente la ida/llegada.
// Pareado con FLY_SHIFT en transition.ts (ratio ~0.6). Ver flyThrough.
const FLY_RADIUS = 40;

// Un "stop" del recorrido = una panorámica 360° navegable. Igual que un Aisle
// pero con `counts`: si suma a los 6 pasillos del recorrido (para la credencial).
interface Stop {
  id: string;
  name: string;
  panorama: string;
  placeholderColor: string;
  counts: boolean;
  heading?: number; // rotación Y inicial del cielo (corredor de frente)
}

// Entrada / hall central: el primer stop al entrar a la tienda (panorámica
// `acceso`, la que antes era el fondo del menú). NO cuenta para los 6 pasillos
// ni la credencial — es el punto de llegada desde la fachada, y desde acá se
// avanza a los pasillos con las flechas.
const HALL: Stop = {
  id: 'acceso',
  name: 'Entrada',
  panorama: '/panoramas/acceso.jpg',
  placeholderColor: '#041E42',
  counts: false,
  heading: 270, // mira hacia adentro de la tienda (90 + 180: el corredor al frente, no al fondo)
};

// Secuencia del recorrido: hall + los 6 pasillos (orden de aisles.json).
const stops: Stop[] = [HALL, ...data.aisles.map((a) => ({ ...a, counts: true }))];

type Route =
  | { name: 'facade' }
  | { name: 'aisle'; aisleId: string }
  | { name: 'credential' };

class Router {
  private current: Route = { name: 'facade' };
  private isFirstRender = true;
  private inTransition = false;

  init() {
    this.go({ name: 'facade' });
  }

  async go(route: Route) {
    if (this.inTransition) return;
    this.inTransition = true;
    try {
      if (!this.isFirstRender) await fadeOut();
      this.current = route;
      this.render();
      await fadeIn();
      this.isFirstRender = false;
    } finally {
      this.inTransition = false;
    }
  }

  goFacade() {
    void this.go({ name: 'facade' });
  }

  goAisle(aisleId: string) {
    void this.go({ name: 'aisle', aisleId });
  }

  goCredential() {
    track('recorrido_completo');
    void this.go({ name: 'credential' });
  }

  // Callbacks de un pasillo: salir al splash + flechas anterior/siguiente según
  // la posición en el recorrido (orden de stops) + accesos directos del menú.
  private aisleCb(aisleId: string): AisleCallbacks {
    const idx = stops.findIndex((s) => s.id === aisleId);
    const prev = idx > 0 ? stops[idx - 1] : undefined;
    const next = idx < stops.length - 1 ? stops[idx + 1] : undefined;
    const completed = progress.count() === data.aisles.length;
    return {
      // "Salir" sale siempre al splash (punto de entrada / reset entre usuarios).
      onBack: () => this.goFacade(),
      // Las flechas usan glideAisle (crossfade + avance), no el fade a negro.
      onPrev: prev ? () => void this.glideAisle(prev.id, 'prev') : undefined,
      prevName: prev?.name,
      // Hay siguiente pasillo → avanza. Si es el último con el recorrido completo,
      // "siguiente" se vuelve el CTA de finalización (felicitaciones → pantalla
      // final). No es automático: el usuario decide cuándo entrar.
      onNext: next
        ? () => void this.glideAisle(next.id, 'next')
        : completed
        ? () => this.goCredential()
        : undefined,
      nextName: next?.name,
      nextIsFinish: !next && completed,
      // Accesos directos del menú desplegable: los 6 pasillos (sin el hall).
      aisles: data.aisles.map((a) => ({ id: a.id, name: a.name })),
      currentId: aisleId,
      isVisited: (id) => progress.isVisited(id),
      // Saltar a un pasillo con efecto de vuelo; la dirección sigue el orden del
      // recorrido para que el deslizamiento se sienta coherente.
      onSelect: (id) => {
        const here = stops.findIndex((s) => s.id === aisleId);
        const there = stops.findIndex((s) => s.id === id);
        void this.glideAisle(id, there >= here ? 'next' : 'prev');
      },
    };
  }

  // Transición pasillo→pasillo "vuelo" (ida + llegada, sin negro): el cielo
  // actual se aleja con zoom mientras el destino llega desde lejos y se centra.
  async glideAisle(targetId: string, direction: 'next' | 'prev') {
    if (this.inTransition) return;
    const target = stops.find((s) => s.id === targetId);
    const root = document.getElementById(ROOT_ID);
    if (!target || !root) return;

    this.inTransition = true;
    try {
      const oldSky = root.querySelector('a-sky') as HTMLElement | null;
      // Achicar ambos cielos (centrados → sin cambio visual) para amplificar el
      // flujo óptico del desplazamiento. Quitar HUD/flechas para que no "vuelen".
      if (oldSky) oldSky.setAttribute('radius', `${FLY_RADIUS}`);
      Array.from(root.children).forEach((c) => {
        if (c !== oldSky) root.removeChild(c);
      });

      // Cielo destino encima, transparente y SIN depthTest (dibuja sobre el
      // actual mientras llega). Material completo ANTES de añadir: un material
      // parcial perdería side:back y el cielo se vería al revés.
      const { sky: newSky, ready } = createAisleSky(target);
      newSky.setAttribute('radius', `${FLY_RADIUS}`);
      newSky.setAttribute(
        'material',
        'shader: flat; side: back; npot: true; opacity: 0; transparent: true; depthTest: false',
      );
      newSky.setAttribute('render-order', '1');
      root.appendChild(newSky);

      // Esperar la panorámica estándar para no mostrar el placeholderColor.
      await ready;

      await flyThrough(oldSky, newSky, direction);

      // Quitar el cielo viejo y normalizar el nuevo a fondo común (depthTest on,
      // render-order 0, opaco) para que los HUDs queden por delante. El material
      // wholesale borra el src, así que lo recapturo antes y lo re-asiento (puede
      // ser ya la hi-res si alcanzó a hacer upgrade en background).
      if (oldSky && oldSky.parentNode === root) root.removeChild(oldSky);
      const currentSrc = newSky.getAttribute('src');
      newSky.setAttribute('position', '0 0 0');
      newSky.setAttribute('render-order', '0');
      newSky.setAttribute(
        'material',
        'shader: flat; side: back; npot: true; opacity: 1; transparent: false; depthTest: true',
      );
      if (currentSrc) newSky.setAttribute('src', currentSrc);

      this.current = { name: 'aisle', aisleId: targetId };
      setLookControlsEnabled(true);
      resetLookOrientation(); // aterrizar mirando el corredor, no de costado
      if (target.counts) progress.markVisited(target.id);
      track('ver_pasillo', { pasillo_id: target.id, pasillo: target.name });
      buildAisleHuds(root, this.aisleCb(targetId));
    } finally {
      this.inTransition = false;
    }
  }

  // Efecto "entrar a ConstruMart": desde el splash, la foto de la fachada hace
  // zoom (caminar hacia la entrada) mientras el primer pasillo llega y se centra,
  // dejando al usuario adentro de la tienda — sin menú de por medio.
  async enterStore() {
    if (this.inTransition) return;
    const root = document.getElementById(ROOT_ID);
    const target = stops[0]; // hall / entrada central
    if (!root || !target) return;
    track('entrar_tienda');

    this.inTransition = true;
    try {
      // Cielo del primer pasillo encima, transparente y SIN depthTest: dibuja
      // sobre la fachada y la va tapando a medida que aparece (la "revela").
      const { sky: newSky, ready } = createAisleSky(target);
      newSky.setAttribute('radius', `${FLY_RADIUS}`);
      newSky.setAttribute(
        'material',
        'shader: flat; side: back; npot: true; opacity: 0; transparent: true; depthTest: false',
      );
      newSky.setAttribute('render-order', '2');
      root.appendChild(newSky);

      await ready;

      // Zoom de la fachada (caminar hacia la puerta) bajo la entrada del pasillo.
      const facadePhoto = document.getElementById('facade-photo');
      if (facadePhoto) {
        facadePhoto.setAttribute(
          'animation__enterzoom',
          'property: scale; from: 1 1 1; to: 1.9 1.9 1; dur: 760; easing: easeInQuad',
        );
      }

      // El primer pasillo "llega" y se centra mientras tapa la fachada.
      await flyThrough(null, newSky, 'next');

      // Limpiar la fachada y normalizar el cielo a fondo común (HUDs por delante).
      Array.from(root.children).forEach((c) => {
        if (c !== newSky) root.removeChild(c);
      });
      const currentSrc = newSky.getAttribute('src');
      newSky.setAttribute('position', '0 0 0');
      newSky.setAttribute('render-order', '0');
      newSky.setAttribute(
        'material',
        'shader: flat; side: back; npot: true; opacity: 1; transparent: false; depthTest: true',
      );
      if (currentSrc) newSky.setAttribute('src', currentSrc);

      this.current = { name: 'aisle', aisleId: target.id };
      setLookControlsEnabled(true);
      resetLookOrientation(); // aterrizar mirando el corredor, no de costado
      if (target.counts) progress.markVisited(target.id);
      track('ver_pasillo', { pasillo_id: target.id, pasillo: target.name });
      buildAisleHuds(root, this.aisleCb(target.id));
    } finally {
      this.inTransition = false;
    }
  }

  private render() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;

    while (root.firstChild) root.removeChild(root.firstChild);

    const route = this.current;

    if (route.name === 'facade') {
      // Splash/bienvenida fija (foto plana de la fachada). Look-controls off
      // para que la composición no se mueva en mobile/desktop. ENTRAR hace el
      // efecto de entrar a la tienda y deja al usuario en el primer pasillo.
      setLookControlsEnabled(false);
      // Precargar las 360° del hall + pasillos mientras el usuario está en el
      // splash. El tier estándar GATEA la entrada (el botón ENTRAR queda en
      // "Cargando…" hasta que todas cargaron); el hi-res sigue en background.
      const preload = preloadPanoramas(stops);
      renderFacade(root, {
        onEnter: () => void this.enterStore(),
        onReset: () => {
          // Borra el progreso persistido (visor de mano en mano en terreno) y
          // refresca el splash como confirmación.
          track('reiniciar', { origen: 'fachada' });
          progress.reset();
          this.goFacade();
        },
        preload,
      });
      return;
    }

    if (route.name === 'aisle') {
      const stop = stops.find((s) => s.id === route.aisleId);
      if (!stop) {
        this.goFacade();
        return;
      }
      // Look libre dentro del panorama 360°.
      setLookControlsEnabled(true);
      resetLookOrientation(); // aterrizar mirando el corredor, no de costado
      // Entrar a un pasillo cuenta como "recorrido" (el hall no cuenta).
      if (stop.counts) progress.markVisited(stop.id);
      track('ver_pasillo', { pasillo_id: stop.id, pasillo: stop.name });
      renderAisle(root, stop, this.aisleCb(stop.id));
      return;
    }

    if (route.name === 'credential') {
      setLookControlsEnabled(false);
      // "Volver al inicio" desde la credencial = fin del recorrido completo: el
      // visor pasa a la próxima persona, así que reiniciamos el progreso acá
      // mismo y volvemos al splash listo para empezar de cero (evita tener que
      // resetear a mano). El reset manual de la fachada sigue existiendo para el
      // hand-off a mitad de recorrido, que no pasa por esta pantalla.
      renderCredential(root, {
        onBack: () => {
          track('reiniciar', { origen: 'credencial' });
          progress.reset();
          this.goFacade();
        },
      });
      return;
    }
  }
}

export const router = new Router();
