const FADER_ID = 'fader';
const DEFAULT_DURATION = 240;

function fader(): HTMLElement | null {
  return document.getElementById(FADER_ID);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fadeOut(duration = DEFAULT_DURATION): Promise<void> {
  const el = fader();
  if (!el) return;
  el.setAttribute('visible', 'true');
  el.setAttribute(
    'animation__fade',
    `property: material.opacity; from: 0; to: 1; dur: ${duration}; easing: easeOutQuad`,
  );
  await wait(duration);
}

export async function fadeIn(duration = DEFAULT_DURATION): Promise<void> {
  const el = fader();
  if (!el) return;
  el.setAttribute(
    'animation__fade',
    `property: material.opacity; from: 1; to: 0; dur: ${duration}; easing: easeOutQuad`,
  );
  await wait(duration);
  el.setAttribute('visible', 'false');
}

// Transición "vuelo" entre pasillos, SIN negro: la cámara queda quieta (cómodo,
// nada de locomoción) y se mueven las esferas-cielo. La actual se aleja con
// zoom (efecto de IDA) mientras la nueva LLEGA desde lejos hasta centrarse,
// encadenadas con un crossfade. La nueva termina exactamente centrada → no hay
// salto ni reset que tapar. Con FLY_RADIUS chico (se setea en router) el
// desplazamiento de las esferas produce un flujo óptico fuerte = se nota.
//
// Perillas de intensidad:
//   FLY_SHIFT  — cuánto se desplazan las esferas. Más = más zoom de ida/llegada.
//   FLY_DELAY  — cuánto se solapan ida y llegada (menor = más simultáneo/continuo).
//   FLY_FADE_DELAY — cuándo arranca el crossfade (más tarde = revelado más limpio).
//   FLY_DEPART / FLY_ARRIVE / FLY_FADE — duraciones de cada fase.
// Easing cúbico: acelera (ida) y desacelera (llegada) más suave que el cuadrático.
const FLY_SHIFT = 28;
const FLY_DEPART = 620;
const FLY_ARRIVE = 660;
const FLY_DELAY = 170;
const FLY_FADE = 460;
const FLY_FADE_DELAY = 230;

export async function flyThrough(
  oldSky: HTMLElement | null,
  newSky: HTMLElement,
  direction: 'next' | 'prev',
): Promise<void> {
  const sign = direction === 'next' ? 1 : -1;
  // Cámara mira -Z. Mover la esfera en +Z equivale a avanzar la cámara en -Z
  // (flujo óptico hacia adelante). 'next' avanza; 'prev' invierte el signo.
  const departTo = sign * FLY_SHIFT; // la actual se va (zoom de ida) y se descarta
  const arriveFrom = -sign * FLY_SHIFT; // la nueva entra desde el lado opuesto y se centra

  if (oldSky) {
    oldSky.setAttribute(
      'animation__fly',
      `property: position; from: 0 0 0; to: 0 0 ${departTo}; dur: ${FLY_DEPART}; easing: easeInCubic`,
    );
  }
  // La nueva arranca a moverse casi enseguida (continuidad) y el crossfade entra
  // un poco después, para un revelado más limpio. Descansa en su posición de
  // partida con opacity 0 hasta el delay.
  newSky.setAttribute('position', `0 0 ${arriveFrom}`);
  newSky.setAttribute(
    'animation__flypos',
    `property: position; from: 0 0 ${arriveFrom}; to: 0 0 0; dur: ${FLY_ARRIVE}; delay: ${FLY_DELAY}; easing: easeOutCubic`,
  );
  newSky.setAttribute(
    'animation__flyfade',
    `property: material.opacity; from: 0; to: 1; dur: ${FLY_FADE}; delay: ${FLY_FADE_DELAY}; easing: easeInOutQuad`,
  );

  await wait(Math.max(FLY_DELAY + FLY_ARRIVE, FLY_FADE_DELAY + FLY_FADE) + 30);

  newSky.removeAttribute('animation__flypos');
  newSky.removeAttribute('animation__flyfade');
  if (oldSky) oldSky.removeAttribute('animation__fly');
}
