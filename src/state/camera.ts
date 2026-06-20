/**
 * Controla si la cámara puede girarse en mobile/desktop.
 *
 * En Quest la pose del headset siempre se aplica — esto es WebXR, no se puede
 * (ni debería) prevenir. La fijación del menú en VR se logra colocando todo el
 * contenido en un arco frontal angosto: si el usuario gira la cabeza no
 * encuentra nada que distraiga.
 *
 * En mobile (gyro) y desktop (mouse drag) `enabled: false` sí desactiva la
 * rotación interactiva, dejando el menú quieto frente al usuario.
 */
export function setLookControlsEnabled(enabled: boolean) {
  const camera = document.getElementById('camera');
  if (!camera) return;
  camera.setAttribute(
    'look-controls',
    `enabled: ${enabled}; pointerLockEnabled: false; touchEnabled: ${enabled}; magicWindowTrackingEnabled: ${enabled}`,
  );
}

/**
 * Reinicia la orientación interactiva de la cámara (yaw y pitch a 0) al entrar
 * a un pasillo. En mobile/desktop el look-controls arrastra el ángulo entre
 * escenas: si el usuario giró para mirar una góndola y navega al siguiente
 * pasillo, aterrizaría mirando de costado. Con esto siempre aterriza al frente
 * (-Z), y la rotación del cielo (heading) deja el corredor justo ahí.
 *
 * En Quest no aplica: la pose del headset es física (WebXR) y manda igual; ahí
 * el corredor de frente lo asegura sólo el heading del cielo.
 */
export function resetLookOrientation() {
  const camera = document.getElementById('camera') as (HTMLElement & { components?: any }) | null;
  const lc = camera?.components?.['look-controls'];
  if (lc?.yawObject && lc?.pitchObject) {
    lc.yawObject.rotation.y = 0;
    lc.pitchObject.rotation.x = 0;
  }
}
