/**
 * Selección por TAP — reemplaza el modelo gaze + dwell de la versión VR.
 *
 * En la versión Quest la selección es por mirada (retícula central + fuse de
 * 1.5s). En mobile eso es incómodo, así que acá seleccionamos con un toque
 * directo sobre el botón. La navegación ESPACIAL se mantiene idéntica: el
 * usuario gira el teléfono (giroscopio / arrastre) para encontrar cada botón —
 * incluido "PASILLO ANTERIOR", que sigue a sus espaldas — y lo toca.
 *
 * Por qué raycasting manual y no el `cursor` nativo de A-Frame con
 * `rayOrigin: mouse`: ese cursor dispara 'click' en CADA mouseup/touchend,
 * aunque el gesto haya sido un arrastre para mirar (pelea con look-controls).
 * Acá sólo emitimos 'click' en un tap limpio — movimiento corto y contacto
 * breve — así arrastrar para girar la cámara nunca activa un botón por error.
 *
 * Emite `MouseEvent('click', { bubbles: true })` sobre el `.clickable`
 * intersectado. Los botones de las escenas escuchan 'click' en su entity padre
 * y el evento burbujea, igual que con el cursor original — por eso las escenas
 * no necesitan cambios.
 *
 * Se monta como componente del `<a-scene>` (atributo `tap-select`).
 */
const TAP_MAX_DIST = 12; // px de movimiento tolerado para contar como tap (no arrastre)
const TAP_MAX_MS = 500; // duración máxima del contacto

AFRAME.registerComponent('tap-select', {
  init(this: any) {
    const scene = this.el; // <a-scene>
    const THREE = AFRAME.THREE;
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const tryTap = (
      clientX: number,
      clientY: number,
      startX: number,
      startY: number,
      startT: number,
    ) => {
      // Si arrastró o tardó mucho → fue gesto de mirar, no tap.
      const dist = Math.hypot(clientX - startX, clientY - startY);
      if (dist > TAP_MAX_DIST || performance.now() - startT > TAP_MAX_MS) return;

      const camera = scene.camera;
      const canvas = scene.canvas;
      if (!camera || !canvas) return;

      const rect = canvas.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);

      const targets: any[] = [];
      document.querySelectorAll('.clickable').forEach((el: any) => {
        if (el.object3D) targets.push(el.object3D);
      });

      const hits = raycaster.intersectObjects(targets, true);
      if (!hits.length) return;

      // El mesh impactado puede ser un hijo interno: subir hasta el .clickable.
      let obj: any = hits[0].object;
      while (obj && !(obj.el && obj.el.classList?.contains('clickable'))) {
        obj = obj.parent;
      }
      if (obj?.el) obj.el.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    };

    // En mobile, tras un touchend el navegador emite eventos de mouse
    // "fantasma" (~300 ms después) sobre el mismo punto. Como escuchamos touch
    // Y mouse, cada toque se procesaría DOS veces → el toggle del menú (la C)
    // se abría y el fantasma lo volvía a cerrar/abrir. Marcamos el último touch
    // e ignoramos los eventos de mouse que llegan poco después.
    let lastTouch = 0;
    const GHOST_MS = 700;

    // Touch (mobile) — passive para no pelear con look-controls (no preventDefault).
    let touchStart: { x: number; y: number; t: number } | null = null;
    const onTouchStart = (e: TouchEvent) => {
      lastTouch = performance.now();
      if (e.touches.length !== 1) {
        touchStart = null;
        return;
      }
      touchStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: performance.now() };
    };
    const onTouchEnd = (e: TouchEvent) => {
      lastTouch = performance.now();
      if (!touchStart || e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0];
      tryTap(t.clientX, t.clientY, touchStart.x, touchStart.y, touchStart.t);
      touchStart = null;
    };

    // Mouse (desktop) — para testear sin celular. Ignorado si viene de un touch
    // reciente (evento fantasma), para no procesar el mismo toque dos veces.
    let mouseStart: { x: number; y: number; t: number } | null = null;
    const onMouseDown = (e: MouseEvent) => {
      if (performance.now() - lastTouch < GHOST_MS) return;
      if (e.button === 0) mouseStart = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const onMouseUp = (e: MouseEvent) => {
      if (performance.now() - lastTouch < GHOST_MS) return;
      if (!mouseStart) return;
      tryTap(e.clientX, e.clientY, mouseStart.x, mouseStart.y, mouseStart.t);
      mouseStart = null;
    };

    const attach = (canvas: HTMLElement) => {
      canvas.addEventListener('touchstart', onTouchStart, { passive: true });
      canvas.addEventListener('touchend', onTouchEnd, { passive: true });
      canvas.addEventListener('mousedown', onMouseDown);
      canvas.addEventListener('mouseup', onMouseUp);
    };

    if (scene.canvas) attach(scene.canvas);
    else scene.addEventListener('loaded', () => attach(scene.canvas), { once: true });
  },
});
