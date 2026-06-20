import { requestMotionPermission } from '../state/motion';

export interface FacadeCallbacks {
  // Entra a la tienda: hace el efecto de "entrar a ConstruMart" y deja al
  // usuario en el primer pasillo. Desde ahí se mueve con las flechas, sin menú.
  onEnter: () => void;
  // Reinicia el recorrido (borra el progreso). En el flujo sin menú, el reset
  // del visor entre usuarios vive acá, en el splash.
  onReset: () => void;
}

// Splash de bienvenida. A diferencia de la versión VR (texto 3D de cámara fija),
// en mobile es un OVERLAY HTML full-bleed: aprovecha toda la pantalla del
// celular y es naturalmente responsivo (sin recortarse en portrait). Por debajo
// la escena 3D queda en navy; el ENTRAR pide el permiso de giroscopio y dispara
// la transición 3D de "entrar a la tienda" mientras el overlay se desvanece.
export function renderFacade(root: HTMLElement, cb: FacadeCallbacks) {
  // Fondo navy 3D — lo que se ve detrás del overlay y mientras se desvanece al
  // entrar (antes de que llegue el primer pasillo).
  const sky = document.createElement('a-sky');
  sky.setAttribute('color', '#041E42');
  root.appendChild(sky);

  showFacadeOverlay(cb);
}

function showFacadeOverlay(cb: FacadeCallbacks) {
  // Idempotente: si ya había un overlay (p. ej. al reiniciar), lo reemplaza.
  document.getElementById('facade-overlay')?.remove();

  const el = document.createElement('div');
  el.id = 'facade-overlay';
  el.innerHTML = `
    <div class="facade-stripes"></div>
    <div class="facade-card">
      <div class="facade-head">
        <img class="facade-logo" src="/brand/logo-construmart-white.png" alt="Construmart" />
        <div class="facade-eyebrow">Experiencia 360°</div>
      </div>
      <div class="facade-body">
        <h1 class="facade-title">Conoce la tienda<br>antes de que abra</h1>
        <p class="facade-sub">Recorré los pasillos de Construmart Arica en 360°.</p>
      </div>
      <div class="facade-actions">
        <button id="facade-enter" class="facade-cta" type="button">Entrar a la tienda</button>
        <button id="facade-reset" class="facade-reset" type="button">Reiniciar recorrido</button>
      </div>
    </div>
    <div class="facade-stripes"></div>
  `;
  document.body.appendChild(el);

  el.querySelector('#facade-enter')!.addEventListener('click', () => {
    // El tap es el gesto que iOS exige para habilitar el giroscopio.
    void requestMotionPermission();
    // Desvanecer el overlay mientras la transición 3D revela la tienda.
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 520);
    cb.onEnter();
  });

  el.querySelector('#facade-reset')!.addEventListener('click', () => {
    el.remove();
    cb.onReset(); // re-renderiza la fachada (recrea el overlay)
  });
}
