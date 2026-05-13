const TOTAL_HOTSPOTS = 3;
const found = new Set();
let placaVisible = false;

export async function initGame() {
  console.info('[game] session:', `local-${Date.now()}`);
  orientCoinsToCamera();
  wireHotspots();
  wireHelpModal();
  wirePlacaClose();
  wireReplayBtn();
  mostrarAyudaSiPrimeraVez();
}

function wireHotspots() {
  document.querySelectorAll('.hotspot').forEach(el => {
    el.addEventListener('click', () => handleHotspotClick(el));
  });
}

function handleHotspotClick(el) {
  const id = el.dataset.id;
  console.info('[game] hotspot click', id, 'found=', [...found], 'visible=', placaVisible);
  if (found.has(id) || placaVisible) return;
  showPlaca(id, () => markFound(el, id));
}

function markFound(el, id) {
  if (found.has(id)) return;
  found.add(id);

  const counterEl = document.getElementById('hud-counter');
  if (counterEl) counterEl.setAttribute('value', `${found.size} / ${TOTAL_HOTSPOTS}`);

  try {
    el.setAttribute('animation__found',
      'property: scale; to: 0.01 0.01 0.01; dur: 500; easing: easeInQuad');
    setTimeout(() => el.setAttribute('visible', 'false'), 550);
  } catch (e) {
    console.warn('[game] hotspot hide animation failed', e);
    try { el.setAttribute('visible', 'false'); } catch (_) {}
  }

  try {
    const sfx = document.querySelector('#found-sfx');
    if (sfx?.components?.sound) sfx.components.sound.playSound();
  } catch (_) {}

  if (found.size === TOTAL_HOTSPOTS) {
    setTimeout(() => completarJuego(), 800);
  }
}

function showPlaca(id, onDone) {
  const panel = document.getElementById('placa-panel');
  const img = document.getElementById('placa-img');
  if (!panel || !img) { onDone(); return; }

  placaVisible = true;
  img.setAttribute('src', `#placa-${id}`);
  panel.setAttribute('visible', 'true');
  panel._onDone = onDone;
  console.info('[placa] show', id);
}

function wirePlacaClose() {
  document.getElementById('placa-close')?.addEventListener('click', cerrarPlaca);
}

function cerrarPlaca() {
  const panel = document.getElementById('placa-panel');
  if (!panel || !placaVisible) return;
  panel.setAttribute('visible', 'false');
  placaVisible = false;
  console.info('[placa] close');
  if (panel._onDone) {
    const cb = panel._onDone;
    panel._onDone = null;
    cb();
  }
}

function completarJuego() {
  document.getElementById('complete-panel')?.setAttribute('visible', 'true');
}

function wireReplayBtn() {
  document.getElementById('replay-btn')?.addEventListener('click', () => {
    window.location.reload();
  });
}

function wireHelpModal() {
  document.getElementById('help-btn')?.addEventListener('click', () => {
    if (placaVisible) return;
    document.getElementById('help-panel')?.setAttribute('visible', 'true');
  });
  document.getElementById('help-close')?.addEventListener('click', () => {
    document.getElementById('help-panel')?.setAttribute('visible', 'false');
    try { localStorage.setItem('cm_help_seen', '1'); } catch (_) {}
  });
}

function mostrarAyudaSiPrimeraVez() {
  let visto = false;
  try { visto = !!localStorage.getItem('cm_help_seen'); } catch (_) {}
  if (!visto) document.getElementById('help-panel')?.setAttribute('visible', 'true');
}

function orientCoinsToCamera() {
  const scene = document.querySelector('a-scene');
  if (!scene) return;
  const run = () => {
    const cam = scene.camera;
    const camPos = cam
      ? cam.getWorldPosition(new window.THREE.Vector3())
      : new window.THREE.Vector3(0, 1.6, 0);
    document.querySelectorAll('.hotspot-anchor').forEach((el) => {
      const apply = () => el.object3D.lookAt(camPos);
      if (el.hasLoaded) apply(); else el.addEventListener('loaded', apply, { once: true });
    });
  };
  if (scene.hasLoaded) run(); else scene.addEventListener('loaded', run, { once: true });
}
