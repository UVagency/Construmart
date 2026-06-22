interface CredentialCallbacks {
  onBack: () => void;
}

// Pantalla de finalización (recorrido completo). Igual que el splash, en mobile
// es un OVERLAY HTML full-bleed que aprovecha toda la pantalla del celular (la
// versión VR era texto 3D de cámara fija). Por debajo la escena queda navy.
export function renderCredential(root: HTMLElement, cb: CredentialCallbacks) {
  // Fondo navy 3D — lo que se ve detrás del overlay y mientras se desvanece.
  const sky = document.createElement('a-sky');
  sky.setAttribute('color', '#041E42');
  root.appendChild(sky);

  // Idempotente.
  document.getElementById('credential-overlay')?.remove();

  const el = document.createElement('div');
  el.id = 'credential-overlay';
  el.className = 'cm-overlay';
  el.innerHTML = `
    <div class="facade-stripes"></div>
    <div class="facade-card">
      <div class="facade-head">
        <img class="facade-logo" src="/brand/logo-construmart-white.png" alt="Construmart" />
        <div class="facade-eyebrow">Recorrido completo</div>
      </div>
      <div class="facade-body">
        <div class="cm-badge">
          <span class="cm-badge-num">6/6</span>
          <span class="cm-badge-label">Pasillos</span>
        </div>
        <h1 class="facade-title">¡Aún queda mucho<br>por descubrir!</h1>
        <p class="facade-sub">Vive la experiencia completa este 23 de julio en la gran reinauguración de Construmart Arica.</p>
      </div>
      <div class="facade-actions">
        <button id="credential-back" class="facade-cta" type="button">Volver al inicio</button>
      </div>
    </div>
    <div class="facade-stripes"></div>
  `;
  document.body.appendChild(el);

  el.querySelector('#credential-back')!.addEventListener('click', () => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 520);
    cb.onBack();
  });
}
