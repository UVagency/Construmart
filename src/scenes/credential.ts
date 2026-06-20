import { COLORS, ASSETS } from '../theme';
import { makeText } from '../components/text-msdf';
import { keepFitted } from '../state/viewport';

interface CredentialCallbacks {
  onBack: () => void;
}

const Z = -6.5;

export function renderCredential(root: HTMLElement, cb: CredentialCallbacks) {
  const sky = document.createElement('a-sky');
  sky.setAttribute('color', COLORS.navy);
  root.appendChild(sky);

  // Contenedor ajustable (cámara fija): en portrait el contenido ancho se
  // recortaba a lo ancho; `keepFitted` lo aleja lo justo para que entre. El
  // <a-sky> de fondo queda afuera.
  const wrap = document.createElement('a-entity');

  // Stripe top
  wrap.appendChild(stripesBar(0, 4.0, Z + 0.02, 6.0, 0.07, 5));

  // Logo blanco
  const logo = document.createElement('a-image');
  logo.setAttribute('src', ASSETS.logoWhite);
  logo.setAttribute('width', '1.95');
  logo.setAttribute('height', '0.38');
  logo.setAttribute('position', `0 3.35 ${Z + 0.02}`);
  logo.setAttribute('material', 'shader: flat; transparent: true; alphaTest: 0.05');
  wrap.appendChild(logo);

  // Eyebrow
  const eyebrow = makeText({
    value: 'R E C O R R I D O   C O M P L E T O',
    font: 'eyebrow',
    color: COLORS.yellow,
    width: 4.0,
    letterSpacing: 6,
  });
  eyebrow.setAttribute('position', `0 2.80 ${Z + 0.01}`);
  wrap.appendChild(eyebrow);

  // Headline
  const head1 = makeText({
    value: 'AÚN QUEDA MUCHO',
    font: 'display',
    color: COLORS.yellow,
    width: 5.8,
    wrapCount: 22,
  });
  head1.setAttribute('position', `0 2.40 ${Z + 0.01}`);
  wrap.appendChild(head1);

  const head2 = makeText({
    value: 'POR DESCUBRIR!',
    font: 'display',
    color: COLORS.yellow,
    width: 5.8,
    wrapCount: 22,
  });
  head2.setAttribute('position', `0 1.65 ${Z + 0.01}`);
  wrap.appendChild(head2);

  // Stripe bar — bien separado para no invadir la altura visual del head2.
  wrap.appendChild(stripesBar(0, 1.10, Z + 0.01, 1.0, 0.05, 4));

  // Sub (Inter Regular — tildes en "reinauguración")
  const sub = makeText({
    value:
      'Vive la experiencia completa este 23 de julio\nen la gran reinauguración de Construmart Arica',
    font: 'body',
    color: COLORS.white,
    opacity: 0.85,
    width: 5.0,
  });
  sub.setAttribute('position', `0 0.7 ${Z + 0.01}`);
  wrap.appendChild(sub);

  // Badge central
  const badgeWrap = document.createElement('a-entity');
  badgeWrap.setAttribute('position', `0 -0.35 ${Z + 0.5}`);
  badgeWrap.setAttribute(
    'animation__pulse',
    'property: scale; from: 1 1 1; to: 1.04 1.04 1; dir: alternate; loop: true; dur: 1200; easing: easeInOutSine',
  );
  badgeWrap.setAttribute(
    'animation__in',
    'property: scale; from: 0.01 0.01 0.01; to: 1 1 1; dur: 520; easing: easeOutBack',
  );

  const badgeRing = document.createElement('a-ring');
  badgeRing.setAttribute('radius-inner', '0.62');
  badgeRing.setAttribute('radius-outer', '0.7');
  badgeRing.setAttribute('color', COLORS.yellow);
  badgeRing.setAttribute('material', 'shader: flat');
  badgeWrap.appendChild(badgeRing);

  const badge = document.createElement('a-circle');
  badge.setAttribute('radius', '0.62');
  badge.setAttribute('color', COLORS.navyDeep);
  badge.setAttribute('material', 'shader: flat');
  badgeWrap.appendChild(badge);

  const badgeText = makeText({
    value: '6/6',
    font: 'display',
    color: COLORS.yellow,
    width: 3.6,
  });
  badgeText.setAttribute('position', '0 0.08 0.01');
  badgeWrap.appendChild(badgeText);

  const badgeSubtext = makeText({
    value: 'PASILLOS',
    font: 'eyebrow',
    color: COLORS.white,
    width: 2.6,
    letterSpacing: 8,
  });
  badgeSubtext.setAttribute('position', '0 -0.27 0.01');
  badgeWrap.appendChild(badgeSubtext);

  wrap.appendChild(badgeWrap);

  // CTA
  const btn = document.createElement('a-entity');
  btn.setAttribute('hoverable', 'scale: 1.05; duration: 160');
  btn.setAttribute('position', `0 -1.65 ${Z + 0.5}`);

  const fill = document.createElement('a-plane');
  fill.setAttribute('width', '2.6');
  fill.setAttribute('height', '0.62');
  fill.setAttribute('color', COLORS.yellow);
  fill.setAttribute('material', 'shader: flat');
  fill.classList.add('clickable');
  btn.appendChild(fill);

  const label = makeText({
    value: 'VOLVER AL INICIO',
    font: 'eyebrow',
    color: COLORS.navy,
    width: 3.6,
    letterSpacing: 4,
  });
  label.setAttribute('position', '0 0 0.01');
  btn.appendChild(label);

  btn.addEventListener('click', cb.onBack);
  wrap.appendChild(btn);

  root.appendChild(wrap);
  // Ancho del elemento más ancho (la stripe top, 6.0) + aire; plano a |Z|.
  keepFitted(wrap, 6.2, Math.abs(Z));
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
