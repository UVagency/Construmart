const TOTAL_HOTSPOTS = 3;
const found = new Set();
let storyPlaying = false;

// Tolerancias para distinguir tap de drag (look-controls usa drag para girar la cámara).
const TAP_MAX_DIST = 12;   // px de movimiento tolerado
const TAP_MAX_MS = 500;    // duración máxima del contacto

export async function initGame() {
  console.info('[game] session:', `local-${Date.now()}`);

  setupTapHandler();
  orientCoinsToCamera();

  const total = document.getElementById('total');
  if (total) total.textContent = String(TOTAL_HOTSPOTS);

  wireHelpModal();
}

function orientCoinsToCamera() {
  const scene = document.querySelector('a-scene');
  if (!scene) return;
  const run = () => {
    const cam = scene.camera;
    const camPos = cam ? cam.getWorldPosition(new window.THREE.Vector3()) : new window.THREE.Vector3(0, 1.6, 0);
    document.querySelectorAll('.hotspot-anchor').forEach((el) => {
      const apply = () => el.object3D.lookAt(camPos);
      if (el.hasLoaded) apply(); else el.addEventListener('loaded', apply, { once: true });
    });
  };
  if (scene.hasLoaded) run(); else scene.addEventListener('loaded', run, { once: true });
}

function setupTapHandler() {
  const scene = document.querySelector('a-scene');
  if (!scene) return;

  const attach = () => {
    const canvas = scene.canvas;
    if (!canvas || !window.THREE) {
      console.warn('[game] canvas o THREE no disponibles');
      return;
    }

    const raycaster = new window.THREE.Raycaster();
    const ndc = new window.THREE.Vector2();

    const tryTap = (clientX, clientY, startX, startY, startT) => {
      const dx = clientX - startX;
      const dy = clientY - startY;
      const dist = Math.hypot(dx, dy);
      const elapsed = performance.now() - startT;
      // Si arrastró o tardó mucho → fue gesto de mirar, no tap.
      if (dist > TAP_MAX_DIST || elapsed > TAP_MAX_MS) return;

      const camera = scene.camera;
      if (!camera) return;

      const rect = canvas.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);

      const targets = [];
      document.querySelectorAll('.hotspot').forEach((el) => {
        if (el.object3D) targets.push(el.object3D);
      });

      const hits = raycaster.intersectObjects(targets, true);
      if (hits.length === 0) return;

      // Subir al padre .hotspot (el mesh puede ser un hijo interno).
      let obj = hits[0].object;
      while (obj && !(obj.el && obj.el.classList?.contains('hotspot'))) {
        obj = obj.parent;
      }
      if (obj?.el) handleHotspotClick(obj.el);
    };

    // Touch (mobile) — passive para no pelear con look-controls.
    let touchStart = null;
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { touchStart = null; return; }
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now() };
    }, { passive: true });
    canvas.addEventListener('touchend', (e) => {
      if (!touchStart || e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0];
      tryTap(t.clientX, t.clientY, touchStart.x, touchStart.y, touchStart.t);
      touchStart = null;
    }, { passive: true });

    // Mouse (desktop) — necesario para testear sin celular y como fallback
    // si el browser suprime touchend en algún flow exótico.
    let mouseStart = null;
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      mouseStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    });
    canvas.addEventListener('mouseup', (e) => {
      if (!mouseStart) return;
      tryTap(e.clientX, e.clientY, mouseStart.x, mouseStart.y, mouseStart.t);
      mouseStart = null;
    });
  };

  if (scene.hasLoaded && scene.canvas) attach();
  else scene.addEventListener('loaded', attach, { once: true });
}

function handleHotspotClick(el) {
  const id = el.dataset.id;
  if (found.has(id) || storyPlaying) return;

  // Reproducimos el video ANTES de marcar como encontrado. Si el usuario sale antes
  // del final, el hotspot sigue disponible para reintentar.
  playStory(id, (completed) => {
    if (!completed) return;
    markFound(el, id);
  });
}

function markFound(el, id) {
  found.add(id);

  el.setAttribute('material', 'color: #2A5DB9; opacity: 0.9; emissive: #2A5DB9; emissiveIntensity: 0.6');
  el.setAttribute(
    'animation__found',
    'property: scale; to: 0.01 0.01 0.01; dur: 500; easing: easeInQuad'
  );

  const sfx = document.querySelector('#found-sfx');
  if (sfx?.components?.sound) sfx.components.sound.playSound();

  const counter = document.getElementById('counter');
  if (counter) counter.textContent = String(found.size);

  if (found.size === TOTAL_HOTSPOTS) {
    setTimeout(() => completeGame(), 800);
  }
}

function playStory(id, onDone) {
  const overlay = document.getElementById('story-overlay');
  const video = document.getElementById('story-video');
  const closeBtn = document.getElementById('story-close');
  if (!overlay || !video) { onDone(true); return; }

  storyPlaying = true;
  let resolved = false;
  const finish = (completed) => {
    if (resolved) return;
    resolved = true;
    storyPlaying = false;
    onDone(completed);
  };

  const cleanup = () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
    overlay.classList.add('hidden');
    video.removeEventListener('ended', onEnded);
    closeBtn?.removeEventListener('click', onClose);
  };

  const onEnded = () => {
    cleanup();
    finish(true);
  };

  const onClose = () => {
    const nearEnd = video.duration && video.currentTime >= video.duration - 0.3;
    cleanup();
    finish(nearEnd);
  };

  // Orden importa en iOS: src → load() → play() sincronicamente dentro del
  // gesto de touchend. Sin load() previo, play() suele quedar bufferando el
  // frame 1 cuando el src cambia en caliente.
  video.src = `/assets/historia${id}.mp4`;
  video.load();
  overlay.classList.remove('hidden');
  video.addEventListener('ended', onEnded);
  closeBtn?.addEventListener('click', onClose);

  const playPromise = video.play();
  if (playPromise && typeof playPromise.catch === 'function') {
    playPromise.catch((err) => {
      // Si el browser bloqueó el play (autoplay policy raro), mostramos controles
      // para que el usuario pueda iniciarlo manualmente.
      console.warn('[game] video play blocked, showing controls', err);
      video.setAttribute('controls', 'controls');
    });
  }
}

async function completeGame() {
  const overlay = document.getElementById('complete-overlay');
  overlay?.classList.remove('hidden');

  const code = await pickCoupon();
  window.location.href = `/success.html?code=${code}`;
}

async function pickCoupon() {
  try {
    const res = await fetch('/coupons.json', { cache: 'no-store' });
    const data = await res.json();
    const codes = data?.codes ?? [];
    if (codes.length === 0) throw new Error('coupon pool empty');
    return codes[Math.floor(Math.random() * codes.length)];
  } catch (e) {
    console.warn('[game] fallback coupon (coupons.json failed):', e);
    return `UV-DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }
}

function wireHelpModal() {
  const btn = document.getElementById('help-btn');
  const modal = document.getElementById('help-modal');
  const close = document.getElementById('help-close');
  if (!btn || !modal) return;

  const HELP_SEEN_KEY = 'cm_help_seen';
  const markSeen = () => {
    try { localStorage.setItem(HELP_SEEN_KEY, '1'); } catch (_) { /* modo privado */ }
  };

  btn.addEventListener('click', () => modal.classList.remove('hidden'));
  close?.addEventListener('click', () => {
    modal.classList.add('hidden');
    markSeen();
  });

  // Primera visita → mostrar el "¿Cómo jugar?" automáticamente. Marcamos como visto
  // recién al cerrar para que, si el usuario navega antes de leerlo, vuelva a aparecer.
  let alreadySeen = false;
  try { alreadySeen = !!localStorage.getItem(HELP_SEEN_KEY); } catch (_) { /* ignore */ }
  if (!alreadySeen) modal.classList.remove('hidden');
}
