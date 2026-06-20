import { COLORS, ASSETS } from '../theme';
import { makeText } from '../components/text-msdf';
import { requestMotionPermission } from '../state/motion';

export interface FacadeCallbacks {
  // Entra a la tienda: hace el efecto de "entrar a ConstruMart" y deja al
  // usuario en el primer pasillo. Desde ahí se mueve con las flechas, sin menú.
  onEnter: () => void;
  // Reinicia el recorrido (borra el progreso). En el flujo sin menú, el reset
  // del visor entre usuarios vive acá, en el splash.
  onReset: () => void;
}

// Plano de bienvenida: la fachada de la tienda. Es una foto PLANA (no 360°),
// tal como se acordó con el cliente — la entrada al recorrido. Look-controls
// están off (cámara fija) para que la composición no se mueva en mobile/desktop.
const Z = -4.2;

export function renderFacade(root: HTMLElement, cb: FacadeCallbacks) {
  // Backdrop navy de base — fallback mientras carga la foto (o si no existe aún).
  const sky = document.createElement('a-sky');
  sky.setAttribute('color', COLORS.navy);
  root.appendChild(sky);

  // (La foto plana de la fachada se removió a pedido del cliente: el splash
  // queda como tarjeta de marca sobre navy. El efecto de entrada `enterStore`
  // sigue andando — su zoom a #facade-photo está guardado con un if.)

  // Panel navy semiopaco para legibilidad del texto sobre el fondo.
  const panel = document.createElement('a-plane');
  panel.setAttribute('width', '5.4');
  panel.setAttribute('height', '3.2');
  panel.setAttribute('position', `0 1.5 ${Z}`);
  panel.setAttribute('material', `shader: flat; color: ${COLORS.navy}; opacity: 0.9; transparent: true`);
  root.appendChild(panel);

  // Stripe decorativa arriba del panel.
  root.appendChild(stripesBar(0, 3.05, Z + 0.02, 4.6, 0.06, 5));

  // Logo wordmark blanco.
  const logo = document.createElement('a-image');
  logo.setAttribute('src', ASSETS.logoWhite);
  logo.setAttribute('width', '2.1');
  logo.setAttribute('height', '0.41');
  logo.setAttribute('position', `0 2.55 ${Z + 0.02}`);
  logo.setAttribute('material', 'shader: flat; transparent: true; alphaTest: 0.05');
  root.appendChild(logo);

  // Eyebrow.
  const eyebrow = makeText({
    value: 'E X P E R I E N C I A   3 6 0',
    font: 'eyebrow',
    color: COLORS.white,
    opacity: 0.7,
    width: 2.8,
    letterSpacing: 6,
  });
  eyebrow.setAttribute('position', `0 2.05 ${Z + 0.01}`);
  root.appendChild(eyebrow);

  // Titular.
  const head1 = makeText({
    value: 'CONOCE LA TIENDA',
    font: 'display',
    color: COLORS.yellow,
    width: 5.0,
    wrapCount: 18,
  });
  head1.setAttribute('position', `0 1.62 ${Z + 0.01}`);
  root.appendChild(head1);

  const head2 = makeText({
    value: 'ANTES DE QUE ABRA',
    font: 'display',
    color: COLORS.yellow,
    width: 5.0,
    wrapCount: 18,
  });
  head2.setAttribute('position', `0 1.05 ${Z + 0.01}`);
  root.appendChild(head2);

  const sub = makeText({
    value: 'Recorre los pasillos de Construmart Arica en 360.',
    font: 'body',
    color: COLORS.white,
    opacity: 0.85,
    width: 4.2,
  });
  sub.setAttribute('position', `0 0.55 ${Z + 0.01}`);
  root.appendChild(sub);

  // CTA "ENTRAR" — tap. El tap pide además el permiso de giroscopio iOS.
  root.appendChild(buildEnterButton(cb.onEnter, Z));

  // Reset discreto del recorrido (visor pasa de mano en mano en terreno).
  root.appendChild(buildResetButton(cb.onReset, Z));
}

function buildResetButton(onReset: () => void, z: number): HTMLElement {
  const btn = document.createElement('a-entity');
  btn.setAttribute('hoverable', 'scale: 1.06; duration: 160');
  btn.setAttribute('position', `0 -0.85 ${z + 0.5}`);

  const border = document.createElement('a-plane');
  border.setAttribute('width', '2.0');
  border.setAttribute('height', '0.4');
  border.setAttribute('color', COLORS.white);
  border.setAttribute('material', 'shader: flat; opacity: 0.2');
  border.setAttribute('position', '0 0 -0.01');
  btn.appendChild(border);

  const fill = document.createElement('a-plane');
  fill.setAttribute('width', '1.96');
  fill.setAttribute('height', '0.36');
  fill.setAttribute('color', COLORS.navyDeep);
  fill.setAttribute('material', 'shader: flat');
  fill.classList.add('clickable');
  btn.appendChild(fill);

  const label = makeText({
    value: 'REINICIAR RECORRIDO',
    font: 'eyebrow',
    color: COLORS.white,
    opacity: 0.8,
    width: 2.3,
    letterSpacing: 3,
  });
  label.setAttribute('position', '0 0 0.01');
  btn.appendChild(label);

  btn.addEventListener('click', onReset);
  return btn;
}

function buildEnterButton(onEnter: () => void, z: number): HTMLElement {
  const btn = document.createElement('a-entity');
  btn.setAttribute('hoverable', 'scale: 1.05; duration: 160');
  btn.setAttribute('position', `0 0.0 ${z + 0.5}`);
  btn.setAttribute(
    'animation__pulse',
    'property: scale; from: 1 1 1; to: 1.04 1.04 1; dir: alternate; loop: true; dur: 1100; easing: easeInOutSine',
  );

  const bg = document.createElement('a-plane');
  bg.setAttribute('width', '3.1');
  bg.setAttribute('height', '0.6');
  bg.setAttribute('color', COLORS.yellow);
  bg.setAttribute('material', 'shader: flat');
  bg.classList.add('clickable');
  btn.appendChild(bg);

  const label = makeText({
    value: 'ENTRAR A LA TIENDA',
    font: 'eyebrow',
    color: COLORS.navy,
    width: 2.7,
    letterSpacing: 2,
  });
  label.setAttribute('position', '0 0.05 0.01');
  btn.appendChild(label);

  const hint = makeText({
    value: 'Tocá para entrar',
    font: 'body',
    color: COLORS.navy,
    opacity: 0.7,
    width: 1.8,
  });
  hint.setAttribute('position', '0 -0.16 0.01');
  btn.appendChild(hint);

  // El tap de ENTRAR es el gesto de usuario que iOS exige para habilitar el
  // giroscopio (magic-window) de los pasillos. Lo pedimos acá y, pase lo que
  // pase con el permiso, entramos a la tienda.
  btn.addEventListener('click', () => {
    void requestMotionPermission();
    onEnter();
  });
  return btn;
}

function stripesBar(x: number, y: number, z: number, width: number, height: number, repeatX: number): HTMLElement {
  const bar = document.createElement('a-plane');
  bar.setAttribute('width', `${width}`);
  bar.setAttribute('height', `${height}`);
  bar.setAttribute('position', `${x} ${y} ${z}`);
  bar.setAttribute(
    'material',
    `src: url(${ASSETS.stripes}); shader: flat; repeat: ${repeatX} 1; transparent: false`,
  );
  return bar;
}
