/**
 * Ajuste responsivo de las escenas de CÁMARA FIJA (fachada, credencial).
 *
 * En esas escenas los look-controls están off, así que el usuario no puede
 * panear: todo el contenido tiene que entrar en el viewport. El problema es el
 * celular en VERTICAL (portrait): el FOV vertical de la cámara es fijo (80°),
 * pero el FOV HORIZONTAL depende del aspect ratio — en portrait (aspect < 1) se
 * angosta y una tarjeta ancha se recorta por los lados.
 *
 * Solución: alejar el grupo en Z lo justo para que su ancho entre en el FOV
 * horizontal actual (más lejos = se ve más chico = entra). En landscape el FOV
 * horizontal es amplio y el desplazamiento es 0 (no toca nada).
 */
function fitPushbackZ(contentW: number, baseZ: number): number {
  const aspect = (window.innerWidth || 1) / (window.innerHeight || 1);
  const FOV = (80 * Math.PI) / 180; // fov vertical default de <a-camera>
  const hFov = 2 * Math.atan(Math.tan(FOV / 2) * aspect); // fov horizontal según aspect
  const visPerUnit = 2 * Math.tan(hFov / 2); // ancho visible por unidad de distancia
  const MARGIN = 0.92; // aire a los lados
  const needDist = contentW / (visPerUnit * MARGIN);
  return -Math.max(0, needDist - baseZ); // negativo = más lejos; 0 si ya entra
}

/**
 * Mantiene `wrap` ajustado al viewport y reacciona a rotaciones de pantalla
 * mientras siga montado (se autolimpia al desmontarse al cambiar de escena).
 * `contentW` = ancho del elemento más ancho del grupo; `baseZ` = distancia
 * positiva de su plano principal a la cámara.
 */
export function keepFitted(wrap: HTMLElement, contentW: number, baseZ: number): void {
  const apply = () => {
    wrap.setAttribute('position', `0 0 ${fitPushbackZ(contentW, baseZ).toFixed(2)}`);
  };
  apply();

  const onResize = () => {
    if (!wrap.isConnected) {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      return;
    }
    apply();
  };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);
}
