import './styles.css';

const path = window.location.pathname;

// Router simple — carga lógica por página.
if (path === '/' || path.endsWith('/index.html')) {
  initLanding();
} else if (path.endsWith('/experience.html')) {
  initExperience();
} else if (path.endsWith('/success.html')) {
  initSuccess();
}

// ─────────────────────────────────────────────────────────────
// Landing: captura opcional de lead + permiso de giroscopio iOS
// ─────────────────────────────────────────────────────────────
function initLanding() {
  const btn = document.getElementById('start-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    const name = document.getElementById('name')?.value?.trim();
    const phone = document.getElementById('phone')?.value?.trim();
    if (name) sessionStorage.setItem('lead_name', name);
    if (phone) sessionStorage.setItem('lead_phone', phone);

    // iOS 13+ requiere permiso explícito de DeviceMotion con un tap del usuario.
    await requestMotionPermission();

    // Marca que el usuario arrancó desde el landing — /experience valida este flag
    // y redirige a / si falta (evita entrar directo y saltearse el permiso de giroscopio).
    sessionStorage.setItem('entered_from_landing', '1');

    window.location.href = '/experience.html';
  });
}

async function requestMotionPermission() {
  const DME = window.DeviceMotionEvent;
  if (DME && typeof DME.requestPermission === 'function') {
    try {
      await DME.requestPermission();
    } catch (e) {
      console.warn('[motion] permiso denegado o error:', e);
    }
  }
  const DOE = window.DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === 'function') {
    try {
      await DOE.requestPermission();
    } catch (e) {
      console.warn('[orientation] permiso denegado o error:', e);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Experience: arranca el juego una vez que A-Frame está listo
// ─────────────────────────────────────────────────────────────
function initExperience() {
  // Gate: si el usuario entró directo a /experience (sin pasar por el landing),
  // no tenemos el permiso de DeviceMotion de iOS 13+ — replace() evita que "atrás"
  // vuelva a /experience sin permiso.
  if (!sessionStorage.getItem('entered_from_landing')) {
    window.location.replace('/');
    return;
  }

  const SPLASH_MIN_MS = 1200; // asegurar visibilidad del branding aunque cargue rápido
  const splashStart = performance.now();

  import('./game.js').then(({ initGame }) => {
    const scene = document.querySelector('a-scene');
    if (!scene) return;

    const boot = () => {
      initGame();
      hideSplash(splashStart, SPLASH_MIN_MS);
    };

    if (scene.hasLoaded) boot();
    else scene.addEventListener('loaded', boot, { once: true });
  });
}

function hideSplash(startedAt, minMs) {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const elapsed = performance.now() - startedAt;
  const wait = Math.max(0, minMs - elapsed);
  setTimeout(() => {
    splash.style.opacity = '0';
    splash.style.pointerEvents = 'none';
    setTimeout(() => splash.remove(), 500);
  }, wait);
}

// ─────────────────────────────────────────────────────────────
// Success: cupón con QR + guardar como imagen + pantalla completa
// UX pensada para obreros (público meta): poca lectura, acciones grandes,
// el cajero escanea el QR y el usuario no tiene que tipear nada.
// ─────────────────────────────────────────────────────────────
async function initSuccess() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code') || '——————';

  document.getElementById('coupon-code').textContent = code;
  document.getElementById('fs-code').textContent = code;

  // Cargar el módulo de imagen/QR (dynamic import → no infla las otras páginas)
  const { generateCouponBlob, generateQrDataUrl } = await import('./coupon-image.js');

  // Pintar QR en el ticket
  try {
    const qrUrl = await generateQrDataUrl(code);
    const small = `<img src="${qrUrl}" alt="QR del cupón" class="w-48 h-48 rounded-md" />`;
    document.getElementById('qr-container').innerHTML = small;
    const big = `<img src="${qrUrl}" alt="QR del cupón" class="w-[70vmin] h-[70vmin] max-w-[420px] max-h-[420px]" />`;
    document.getElementById('fs-qr').innerHTML = big;
  } catch (e) {
    console.error('[qr] error generando QR:', e);
  }

  // Botón primario: guardar cupón como imagen
  document.getElementById('save-btn')?.addEventListener('click', async () => {
    await saveCouponImage(code, generateCouponBlob);
  });

  // Botón secundario: pantalla completa para caja
  const fsOverlay = document.getElementById('fs-overlay');
  document.getElementById('fullscreen-btn')?.addEventListener('click', () => {
    fsOverlay.classList.remove('hidden');
    // Pedir fullscreen real si el browser lo soporta
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    // Forzar brillo máximo con wake-lock si está disponible
    requestWakeLock();
  });
  document.getElementById('fs-close')?.addEventListener('click', () => {
    fsOverlay.classList.add('hidden');
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    releaseWakeLock();
  });
}

async function saveCouponImage(code, generateCouponBlob) {
  const toast = (msg) => {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.remove('hidden');
    clearTimeout(saveCouponImage._t);
    saveCouponImage._t = setTimeout(() => t.classList.add('hidden'), 2200);
  };

  try {
    const blob = await generateCouponBlob(code);
    const filename = `construmart-cupon-${code}.png`;
    const file = new File([blob], filename, { type: 'image/png' });

    // Share API con archivos (iOS Safari / Android Chrome modernos):
    // abre el share sheet nativo donde "Guardar imagen" es una opción de primer nivel.
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: 'Mi cupón Construmart',
          text: `Código: ${code}`
        });
        return;
      } catch (shareErr) {
        if (shareErr.name === 'AbortError') return; // usuario canceló
        console.warn('[share] falló, usando fallback download:', shareErr);
      }
    }

    // Fallback: descarga directa
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('¡Guardado en tu celular!');
  } catch (e) {
    console.error('[save] error generando cupón:', e);
    toast('No se pudo guardar. Mostrá el código en caja.');
  }
}

let _wakeLock = null;
async function requestWakeLock() {
  try {
    if (navigator.wakeLock?.request) {
      _wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (e) {
    console.warn('[wakelock] no disponible:', e);
  }
}
function releaseWakeLock() {
  _wakeLock?.release?.();
  _wakeLock = null;
}
