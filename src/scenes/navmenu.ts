import { COLORS, ASSETS } from '../theme';
import { makeText } from '../components/text-msdf';

// Decoración estilo "cartel" Construmart sobre un botón navy: una tira de M's en
// el borde INFERIOR. w/h = ancho/alto del fondo del botón. Devuelve un elemento
// decorativo (sin `clickable`) para apilar por delante del fill.
function cartelDecor(w: number, h: number): HTMLElement {
  const stripH = Math.min(0.05, h * 0.17);
  const repeat = Math.max(3, Math.round(w / 0.17)); // densidad de M's
  const strip = document.createElement('a-plane');
  strip.setAttribute('width', `${w - 0.04}`);
  strip.setAttribute('height', `${stripH}`);
  strip.setAttribute('position', `0 ${-(h / 2 - stripH / 2 - 0.006)} 0.011`);
  strip.setAttribute(
    'material',
    `src: ${ASSETS.cartelStrip}; shader: flat; transparent: true; repeat: ${repeat} 1`,
  );
  return strip;
}

/**
 * Menú de navegación world-space del recorrido, con dos estados (ver sketch del
 * cliente):
 *   - Colapsado:   [← ANTERIOR]   (C ConstruMart)   [SIGUIENTE →]
 *   - Desplegado:  3 accesos directos arriba + (C) + 3 abajo  (las flechas se
 *                  ocultan; en su lugar queda un "salir" discreto).
 * El botón central (C) togglea. Al desplegarse, el cluster sube para centrar la
 * grilla; al colapsar, baja para que la barra quede fuera de la línea de vista.
 * Todo en world-space (no parented a la cámara) para que el reticle gaze pueda
 * fijarlo. Se reconstruye el contenido dinámico al togglear, así no quedan
 * targets `.clickable` invisibles (el raycaster no descarta ocultos por sí solo).
 */
export interface NavMenuOptions {
  aisles: { id: string; name: string }[]; // los 6 pasillos (accesos directos)
  currentId: string; // stop actual (para resaltar el tile en curso)
  isVisited: (id: string) => boolean;
  onSelect: (id: string) => void; // saltar a un pasillo (efecto de vuelo)
  onExit: () => void; // salir al splash / credencial
}

const NAV_Z = -3.7; // distancia del menú (la C) a la cámara: más lejos = tapa menos
const NAV_Y = 0.9; // posición FIJA del cluster: la C no se mueve al abrir/cerrar
const C_GAP = 0.56; // holgura entre la C y el primer item (arriba/abajo)
const TILE_GAP = 0.37; // separación entre items consecutivos (anti-titileo)
const SIDE_X = 1.95; // posición horizontal del "salir" en el menú abierto

// Botones de navegación de recorrido, fuera del cluster de la C (navegación
// espacial): SIGUIENTE al frente y ANTERIOR a las espaldas (darse vuelta), ambos
// a la MISMA altura (arriba) — mirás hacia arriba para cualquiera de los dos.
const NEXT_POS = '0 2.645 -5.52';
const NEXT_SCALE = 1.3248; // +20% sobre 1.104 (segunda vuelta de +20%)
const PREV_POS = '0 2.645 4.44';
const PREV_SCALE = 1.224; // +20% sobre 1.02

export function buildNavMenu(opts: NavMenuOptions): HTMLElement {
  const root = document.createElement('a-entity');
  root.setAttribute('position', `0 ${NAV_Y} ${NAV_Z}`);
  // Achica todo el menú (elementos + separaciones) un 15%, con la C como pivote.
  root.setAttribute('scale', '0.85 0.85 0.85');

  const dynamic = document.createElement('a-entity');
  root.appendChild(dynamic);

  let expanded = false;
  const setExpanded = (v: boolean) => {
    // La C queda fija: sólo se muestran/ocultan los items, sin mover el cluster.
    expanded = v;
    renderDynamic();
  };

  // Botón ConstruMart central — siempre visible, togglea el menú.
  root.appendChild(buildConstruButton(() => setExpanded(!expanded)));

  function renderDynamic() {
    while (dynamic.firstChild) dynamic.removeChild(dynamic.firstChild);
    // Colapsado: solo la C. Desplegado: 6 accesos directos + salir.
    if (expanded) buildExpanded(dynamic, opts);
  }
  renderDynamic();

  return root;
}

// SIGUIENTE pasillo: botón suelto, centrado y arriba-al-frente, más alejado en Z.
export function buildNextButton(
  name: string | undefined,
  finish: boolean,
  onClick: () => void,
): HTMLElement {
  const wrap = document.createElement('a-entity');
  wrap.setAttribute('position', NEXT_POS);
  wrap.setAttribute('scale', `${NEXT_SCALE} ${NEXT_SCALE} ${NEXT_SCALE}`);
  // El nombre del pasillo no se muestra (pedido del cliente): sólo el rótulo.
  // En el estado final sí va el subtítulo "Finalizar recorrido".
  void name;
  wrap.appendChild(
    buildSideButton(
      finish ? 'FELICITACIONES' : 'PASILLO SIGUIENTE',
      finish ? 'Finalizar recorrido' : undefined,
      finish,
      false,
      0,
      onClick,
    ),
  );
  return wrap;
}

// ANTERIOR pasillo: botón suelto a las espaldas (rotado 180° para leerse de
// frente cuando el usuario se da vuelta), a la distancia del cluster.
export function buildPrevButton(name: string | undefined, onClick: () => void): HTMLElement {
  const wrap = document.createElement('a-entity');
  wrap.setAttribute('position', PREV_POS);
  wrap.setAttribute('rotation', '0 180 0');
  wrap.setAttribute('scale', `${PREV_SCALE} ${PREV_SCALE} ${PREV_SCALE}`);
  void name; // el nombre del pasillo no se muestra (pedido del cliente)
  wrap.appendChild(buildSideButton('PASILLO ANTERIOR', undefined, false, false, 0, onClick));
  return wrap;
}

function buildConstruButton(onToggle: () => void): HTMLElement {
  const btn = document.createElement('a-entity');
  btn.setAttribute('hoverable', 'scale: 1.08; duration: 150');

  const ring = document.createElement('a-ring');
  ring.setAttribute('radius-inner', '0.21');
  ring.setAttribute('radius-outer', '0.26');
  ring.setAttribute('color', COLORS.navy);
  ring.setAttribute('material', 'shader: flat');
  ring.setAttribute('position', '0 0 0.002');
  btn.appendChild(ring);

  const circle = document.createElement('a-circle');
  circle.setAttribute('radius', '0.22');
  circle.setAttribute('color', COLORS.yellow);
  circle.setAttribute('material', 'shader: flat');
  circle.classList.add('clickable');
  btn.appendChild(circle);

  // La "C" de ConstruMart.
  const c = makeText({
    value: 'C',
    font: 'display',
    color: COLORS.navy,
    width: 0.58,
    baseline: 'center',
  });
  c.setAttribute('position', '0 0 0.01');
  btn.appendChild(c);

  btn.addEventListener('click', onToggle);
  return btn;
}

function buildExpanded(parent: HTMLElement, opts: NavMenuOptions) {
  // 6 accesos directos: 3 arriba, 3 abajo, con la (C) en el medio. El item más
  // interno (arriba/abajo) arranca a C_GAP de la C; los siguientes, +TILE_GAP.
  opts.aisles.slice(0, 6).forEach((aisle, i) => {
    const rank = i < 3 ? 2 - i : i - 3; // 0 = pegado a la C, 2 = extremo
    const offset = C_GAP + rank * TILE_GAP;
    const y = i < 3 ? offset : -offset;
    const current = aisle.id === opts.currentId;
    const visited = opts.isVisited(aisle.id);
    parent.appendChild(buildTile(aisle.name, y, current, visited, () => opts.onSelect(aisle.id)));
  });

  // En el lugar que dejaron las flechas, un "salir" discreto al inicio.
  parent.appendChild(buildSideButton('SALIR', 'Al inicio', false, true, -SIDE_X, opts.onExit));
}

function buildSideButton(
  eyebrowText: string,
  name: string | undefined,
  highlight: boolean,
  dim: boolean,
  x: number,
  onClick: () => void,
): HTMLElement {
  const btn = document.createElement('a-entity');
  btn.setAttribute('position', `${x} 0 0`);
  btn.setAttribute('hoverable', 'scale: 1.07; duration: 150');
  const scale = dim ? 0.8 : 1;
  btn.setAttribute('scale', `${scale} ${scale} ${scale}`);

  const border = document.createElement('a-plane');
  border.setAttribute('width', '1.78');
  border.setAttribute('height', '0.62');
  border.setAttribute('color', COLORS.yellow);
  border.setAttribute('material', `shader: flat; opacity: ${highlight ? 0.6 : dim ? 0.25 : 0.45}`);
  border.setAttribute('position', '0 0 -0.01');
  btn.appendChild(border);

  const bg = document.createElement('a-plane');
  bg.setAttribute('width', '1.74');
  bg.setAttribute('height', '0.58');
  bg.setAttribute('color', highlight ? COLORS.yellow : COLORS.navy);
  bg.setAttribute('material', `shader: flat; opacity: ${highlight ? 1 : 0.9}`);
  bg.classList.add('clickable');
  btn.appendChild(bg);

  // Cartelería: tira de M's arriba (en los navy; en el amarillo no se vería).
  if (!highlight) btn.appendChild(cartelDecor(1.74, 0.58));

  // Bloque eyebrow + nombre centrado en la zona navy de arriba de la tira de M's
  // (la tira ocupa el borde inferior), para que el nombre no quede pegado abajo.
  const eyebrow = makeText({
    value: eyebrowText,
    font: 'eyebrow',
    color: highlight ? COLORS.navy : COLORS.yellow,
    width: 1.9,
    letterSpacing: 2,
  });
  eyebrow.setAttribute('position', `0 ${name ? 0.16 : 0.03} 0.01`);
  btn.appendChild(eyebrow);

  if (name) {
    const label = makeText({
      value: name,
      font: 'display',
      color: highlight ? COLORS.navy : COLORS.white,
      width: 1.6,
      wrapCount: 18,
      baseline: 'center',
    });
    label.setAttribute('position', '0 -0.04 0.01');
    btn.appendChild(label);
  }

  btn.addEventListener('click', onClick);
  return btn;
}

/**
 * Calibrador de `heading` (sólo dev, detrás de `?tune` en la URL): rota el cielo
 * del pasillo en vivo con botones y muestra el valor, para encontrar el ángulo
 * que deja el corredor de frente y anotarlo en aisles.json. Evita adivinar el
 * heading desde la foto 2D (signo/offset son inciertos hasta verlo en el visor).
 */
export function buildHeadingTuner(): HTMLElement {
  const wrap = document.createElement('a-entity');
  wrap.setAttribute('position', '0 -0.55 -2.5');

  const getSky = () => document.querySelector('a-sky') as HTMLElement | null;
  const getH = () => {
    const r = getSky()?.getAttribute('rotation') as { y?: number } | null;
    return r?.y ? Math.round(r.y) : 0;
  };

  let labelEl: HTMLElement | null = null;
  const renderLabel = () => {
    if (labelEl) wrap.removeChild(labelEl);
    labelEl = makeText({
      value: `heading: ${getH()}  (ponelo en aisles.json)`,
      font: 'eyebrow',
      color: COLORS.yellow,
      width: 3.0,
      letterSpacing: 1,
    });
    labelEl.setAttribute('position', '0 0.34 0');
    wrap.appendChild(labelEl);
  };

  const bump = (d: number) => () => {
    const s = getSky();
    if (s) s.setAttribute('rotation', `0 ${getH() + d} 0`);
    renderLabel();
  };

  wrap.appendChild(tuneBtn('-15', -0.95, bump(-15)));
  wrap.appendChild(tuneBtn('-5', -0.34, bump(-5)));
  wrap.appendChild(tuneBtn('+5', 0.34, bump(5)));
  wrap.appendChild(tuneBtn('+15', 0.95, bump(15)));
  renderLabel();
  return wrap;
}

function tuneBtn(text: string, x: number, onClick: () => void): HTMLElement {
  const b = document.createElement('a-entity');
  b.setAttribute('position', `${x} 0 0`);
  b.setAttribute('hoverable', 'scale: 1.1; duration: 140');
  const bg = document.createElement('a-plane');
  bg.setAttribute('width', '0.52');
  bg.setAttribute('height', '0.3');
  bg.setAttribute('color', COLORS.yellow);
  bg.setAttribute('material', 'shader: flat');
  bg.classList.add('clickable');
  b.appendChild(bg);
  const t = makeText({ value: text, font: 'eyebrow', color: COLORS.navy, width: 0.9 });
  t.setAttribute('position', '0 0 0.01');
  b.appendChild(t);
  b.addEventListener('click', onClick);
  return b;
}

function buildTile(
  name: string,
  y: number,
  current: boolean,
  visited: boolean,
  onClick: () => void,
): HTMLElement {
  const tile = document.createElement('a-entity');
  tile.setAttribute('position', `0 ${y} 0`);
  tile.setAttribute('hoverable', 'scale: 1.05; duration: 140');

  const border = document.createElement('a-plane');
  border.setAttribute('width', '1.46');
  border.setAttribute('height', '0.28');
  border.setAttribute('color', current || visited ? COLORS.yellow : COLORS.white);
  border.setAttribute('material', `shader: flat; opacity: ${current ? 0.95 : visited ? 0.7 : 0.2}`);
  border.setAttribute('position', '0 0 -0.01');
  tile.appendChild(border);

  const fill = document.createElement('a-plane');
  fill.setAttribute('width', '1.42');
  fill.setAttribute('height', '0.24');
  fill.setAttribute('color', current ? COLORS.blue : visited ? COLORS.navyDeep : COLORS.navyPanel);
  fill.setAttribute('material', 'shader: flat');
  fill.classList.add('clickable');
  tile.appendChild(fill);

  const label = makeText({
    value: name.toUpperCase(),
    font: 'display',
    color: COLORS.white,
    width: 1.05,
    wrapCount: 18,
    baseline: 'center',
  });
  // Texto siempre centrado (x=0). El punto de "visitado" va en x=0.62, fuera
  // del ancho del texto, así que no hace falta correr el label (antes lo movía
  // -0.06 y los tiles visitados se veían descentrados).
  // Título en la zona navy arriba de la tira de M's, un poco hacia arriba.
  label.setAttribute('position', '0 0.05 0.01');
  tile.appendChild(label);

  // Cartelería Construmart: tira de M's en el borde inferior.
  tile.appendChild(cartelDecor(1.42, 0.24));

  // Indicador de "visitado": punto amarillo con geometría (a-circle), no texto
  // — los glifos ● / ✓ no están en el atlas MSDF y salían como barrita. El
  // "actual" ya se distingue por el fondo azul + borde más brillante.
  if (visited && !current) {
    const dot = document.createElement('a-circle');
    dot.setAttribute('radius', '0.05');
    dot.setAttribute('color', COLORS.yellow);
    dot.setAttribute('material', 'shader: flat');
    dot.setAttribute('position', '0.62 0 0.01');
    tile.appendChild(dot);
  }

  tile.addEventListener('click', onClick);
  return tile;
}
