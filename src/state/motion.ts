/**
 * Permiso de sensores de movimiento (giroscopio) para iOS 13+.
 *
 * En iOS, DeviceOrientation/DeviceMotion exigen un permiso explícito que SÓLO
 * puede pedirse desde un gesto del usuario. Lo disparamos en el tap de "ENTRAR
 * A LA TIENDA" de la fachada: ahí los look-controls están off, pero al entrar a
 * los pasillos se activa el magic-window (giroscopio) y, sin este permiso, en
 * iOS no se movería al inclinar el teléfono.
 *
 * No-op en Android/desktop (no existe `requestPermission`). Nunca rompe el flujo:
 * si el usuario lo deniega, la experiencia sigue (se mira arrastrando el dedo).
 */
export async function requestMotionPermission(): Promise<void> {
  const DOE = (window as any).DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission === 'function') {
    try {
      await DOE.requestPermission();
    } catch (e) {
      console.warn('[motion] permiso de orientación denegado o error:', e);
    }
  }
  const DME = (window as any).DeviceMotionEvent;
  if (DME && typeof DME.requestPermission === 'function') {
    try {
      await DME.requestPermission();
    } catch (e) {
      console.warn('[motion] permiso de movimiento denegado o error:', e);
    }
  }
}
