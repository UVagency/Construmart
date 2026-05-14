const TOTAL_HOTSPOTS = 3;
const found = new Set();
let placaVisible = false;
let busy = false;

export async function initGame() {
  console.info('[vr] init');
  orientCoinsToCamera();
  wireHotspots();
  wireButtons();
  mostrarAyudaSiPrimeraVez();
}

// ── Hotspots ──────────────────────────────────────────────────────────────────

function wireHotspots() {
  document.querySelectorAll('.hotspot').forEach(el => {
    el.addEventListener('click', () => onHotspotClick(el));
  });
}

function onHotspotClick(el) {
  if (busy || placaVisible || found.has(el.dataset.id)) return;
  showPlaca(el.dataset.id, () => markFound(el, el.dataset.id));
}

// ── Placa ─────────────────────────────────────────────────────────────────────

function showPlaca(id, onDone) {
  const panel = document.getElementById('placa-panel');
  const img = document.getElementById('placa-img');
  if (!panel || !img) { onDone(); return; }

  img.setAttribute('src', `#placa-${id}`);
  posicionarFrenteCamara(panel);
  panel.setAttribute('visible', 'true');
  panel._onDone = onDone;
  placaVisible = true;
  setBusy(500);
}

function cerrarPlaca() {
  if (busy || !placaVisible) return;
  const panel = document.getElementById('placa-panel');
  if (!panel) return;
  placaVisible = false;
  panel.setAttribute('visible', 'false');
  setBusy(500);
  const cb = panel._onDone;
  panel._onDone = null;
  if (cb) cb();
}

function markFound(el, id) {
  if (found.has(id)) return;
  found.add(id);

  const counter = document.getElementById('hud-counter');
  if (counter) counter.setAttribute('value', `${found.size} / ${TOTAL_HOTSPOTS}`);

  try {
    el.setAttribute('animation__found', 'property: scale; to: 0.01 0.01 0.01; dur: 500; easing: easeInQuad');
    setTimeout(() => el.setAttribute('visible', 'false'), 550);
  } catch (_) {
    try { el.setAttribute('visible', 'false'); } catch (_) {}
  }

  try {
    const sfx = document.querySelector('#found-sfx');
    if (sfx?.components?.sound) sfx.components.sound.playSound();
  } catch (_) {}

  if (found.size === TOTAL_HOTSPOTS) {
    setTimeout(() => {
      const cp = document.getElementById('complete-panel');
      if (cp) {
        posicionarFrenteCamara(cp);
        cp.setAttribute('visible', 'true');
      }
    }, 800);
  }
}

// ── Ayuda ─────────────────────────────────────────────────────────────────────

function mostrarAyudaSiPrimeraVez() {
  let visto = false;
  try { visto = !!localStorage.getItem('cm_vr_help_seen'); } catch (_) {}
  if (!visto) {
    const panel = document.getElementById('help-panel');
    if (panel) {
      posicionarFrenteCamara(panel);
      panel.setAttribute('visible', 'true');
    }
  }
}

// ── Botones ───────────────────────────────────────────────────────────────────

function wireButtons() {
  document.getElementById('placa-close')?.addEventListener('click', cerrarPlaca);

  document.getElementById('help-btn')?.addEventListener('click', () => {
    if (busy || placaVisible) return;
    const panel = document.getElementById('help-panel');
    if (panel) {
      posicionarFrenteCamara(panel);
      panel.setAttribute('visible', 'true');
    }
    setBusy(300);
  });

  document.getElementById('help-close')?.addEventListener('click', () => {
    if (busy) return;
    document.getElementById('help-panel')?.setAttribute('visible', 'false');
    try { localStorage.setItem('cm_vr_help_seen', '1'); } catch (_) {}
    setBusy(300);
  });

  document.getElementById('replay-btn')?.addEventListener('click', () => {
    window.location.reload();
  });

  // Fallback para Quest 2: en A-Frame 1.5 el laser-controls no siempre convierte
  // selectstart (WebXR) → triggerdown → click. Disparamos click explícitamente.
  wireControllerSelect('right-hand');
  wireControllerSelect('left-hand');
}

function wireControllerSelect(handId) {
  const hand = document.getElementById(handId);
  if (!hand) return;
  hand.addEventListener('selectstart', () => {
    const intersected = hand.components?.raycaster?.intersectedEls?.[0];
    if (intersected) {
      intersected.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  });
}

// ── Utilidades ────────────────────────────────────────────────────────────────

function setBusy(ms) {
  busy = true;
  setTimeout(() => { busy = false; }, ms);
}

// Posiciona el panel 3 m frente al usuario (solo eje horizontal),
// orientado para mirarlo de frente independientemente de dónde esté parado.
function posicionarFrenteCamara(panelEl) {
  const cam = document.getElementById('camera');
  if (!cam?.object3D) return;

  const camPos = cam.object3D.getWorldPosition(new window.THREE.Vector3());
  const forward = new window.THREE.Vector3(0, 0, -1)
    .applyQuaternion(cam.object3D.getWorldQuaternion(new window.THREE.Quaternion()));

  forward.y = 0;
  if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
  forward.normalize();

  const dist = 3.0;
  const px = +(camPos.x + forward.x * dist).toFixed(2);
  const pz = +(camPos.z + forward.z * dist).toFixed(2);

  panelEl.setAttribute('position', { x: px, y: 1.6, z: pz });

  // Rotar el panel para que su cara (+z local) apunte hacia la cámara
  const yDeg = +window.THREE.MathUtils.radToDeg(
    Math.atan2(-forward.x, -forward.z)
  ).toFixed(1);
  panelEl.setAttribute('rotation', { x: 0, y: yDeg, z: 0 });
}

function orientCoinsToCamera() {
  const scene = document.querySelector('a-scene');
  if (!scene) return;
  const run = () => {
    const cam = scene.camera;
    const camPos = cam
      ? cam.getWorldPosition(new window.THREE.Vector3())
      : new window.THREE.Vector3(0, 1.6, 0);
    document.querySelectorAll('.hotspot-anchor').forEach(el => {
      const apply = () => el.object3D.lookAt(camPos);
      if (el.hasLoaded) apply(); else el.addEventListener('loaded', apply, { once: true });
    });
  };
  if (scene.hasLoaded) run(); else scene.addEventListener('loaded', run, { once: true });
}
