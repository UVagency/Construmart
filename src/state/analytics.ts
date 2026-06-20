// Envoltura mínima sobre gtag (GA4). El tag se carga en index.html; acá sólo
// emitimos los eventos del recorrido. Si gtag no está disponible (dev sin red,
// bloqueadores de anuncios, o el Quest corriendo offline por LAN) es un no-op
// silencioso — la analítica NUNCA debe romper la experiencia en terreno.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    __experiencia?: string;
  }
}

/**
 * Emite un evento GA4. Adjunta `experiencia` (vr|mobile) en cada evento además
 * de la user-property global, para poder segmentar también a nivel evento.
 */
export function track(event: string, params: Record<string, unknown> = {}): void {
  const gtag = window.gtag;
  if (typeof gtag !== 'function') return;
  gtag('event', event, { experiencia: window.__experiencia, ...params });
}
