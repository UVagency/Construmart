import { makeText } from '../components/text-msdf';
import { ASSETS } from '../theme';

let done = false;

/**
 * Fuerza a A-Frame a CONSTRUIR durante el splash los objetos que, si no, se
 * arman recién al entrar al primer pasillo y se ven cargar "elemento por
 * elemento": los tres atlas de fuente MSDF y la textura de cartelería de los
 * botones.
 *
 * Lo hace montando entidades con `visible: false` — A-Frame igual corre el
 * `init` de los componentes (carga la fuente / textura) aunque no se rendericen,
 * así que se calientan los caches internos sin mostrar nada. Al entrar al
 * pasillo, el texto y los carteles aparecen instantáneos.
 *
 * Idempotente. Se cuelga del <a-scene> (no de #scene-root, que el router limpia
 * al cambiar de ruta), así sobrevive a la transición.
 */
export function warmupAFrame(): void {
  if (done) return;
  const scene = document.querySelector('a-scene');
  if (!scene) return;
  done = true;

  const warm = document.createElement('a-entity');
  warm.id = 'warmup';
  warm.setAttribute('visible', 'false');
  warm.setAttribute('position', '0 -100 0'); // fuera de vista, por las dudas

  // Un texto por cada fuente → construye los tres atlas MSDF.
  (['display', 'eyebrow', 'body'] as const).forEach((font) => {
    warm.appendChild(makeText({ value: 'warmup', font }));
  });

  // Textura de cartelería de los botones de pasillo.
  const strip = document.createElement('a-plane');
  strip.setAttribute('material', `src: ${ASSETS.cartelStrip}; shader: flat; transparent: true`);
  warm.appendChild(strip);

  scene.appendChild(warm);
}
