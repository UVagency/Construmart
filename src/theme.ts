/**
 * Paleta y tipografía alineadas con el repo hermano UVagency/Construmart.
 * Tokens copiados verbatim de su tailwind.config.js.
 *
 * Tipografía: las TTF originales (Barlow Condensed Bold + Inter 400/700) viven
 * en scripts/fonts-src/ (gitignored, son fuentes de Google Fonts). Los atlas
 * MSDF que A-Frame text consume se generan con `npm run gen-fonts`
 * (msdf-bmfont-xml) e incluyen el charset español completo: Á É Í Ó Ú Ü Ñ +
 * minúsculas. Los .fnt y .png viven en public/brand/fonts/ y se sirven con
 * el resto del bundle.
 */
export const COLORS = {
  navy: '#041E42',         // cm-navy: bg principal
  navyDeep: '#031736',     // tono propio para "tile visitado"
  navyPanel: '#0A2A5A',    // cm-navy-800: paneles/tiles sobre navy
  blue: '#2A5DB9',         // cm-blue: acento secundario
  blueDark: '#214A94',     // cm-blue-700
  yellow: '#FFB81C',       // cm-yellow: amarillo Construmart
  yellowBright: '#FFD500', // cm-yellow-bright: usado en las stripes diagonales
  yellowSoft: '#FFB81Cb3',
  white: '#FFFFFF',
  dim: '#9CA3AF',          // gris secundario
  dimSoft: '#ffffff80',
  hairline: '#ffffff1a',   // borde sutil 10% blanco
} as const;

// En prod la app vive en construmart.uv.agency/vr/, no en la raíz. Vite expone
// el base path como `import.meta.env.BASE_URL` ('/' en dev, '/vr/' en build).
// Sin esto, paths absolutos a /brand/... pegan contra la raíz del dominio
// (que es OTRO sitio — el AR pilot UVagency/Construmart) → 404 a todos los
// assets de marca y fonts.
const BASE = import.meta.env.BASE_URL;

// A-Frame text component reconoce el `font` como URL a un .fnt cuando no
// coincide con un built-in name (roboto, kelsonsans, etc.).
export const FONTS = {
  display: `${BASE}brand/fonts/barlow-condensed-bold.fnt`,
  eyebrow: `${BASE}brand/fonts/inter-bold.fnt`,
  body: `${BASE}brand/fonts/inter-regular.fnt`,
} as const;

export const ASSETS = {
  logoWhite: `${BASE}brand/logo-construmart-white.png`,
  // Marca "M" de Construmart (las dos barras amarillas) para la cartelería.
  logoM: `${BASE}brand/logo-m.png`,
  // Tira repetible de "M de la mitad para arriba" para el borde superior de los
  // botones-cartel (material con repeat: K 1).
  cartelStrip: `${BASE}brand/cartel-strip.png`,
  stripes: `${BASE}brand/stripes.png`,
  // Panorámica de la entrada de la tienda usada como fondo del home.
  // No es un pasillo (no está en aisles.json) — solo decorado de menú.
  // `homePanorama` es el tier estándar (carga rápida); `homePanoramaHi` es la
  // máxima resolución que se baja en background y reemplaza al estándar.
  homePanorama: `${BASE}panoramas/acceso.jpg`,
  homePanoramaHi: `${BASE}panoramas/acceso.hi.webp`,
  // Foto PLANA de la fachada de bienvenida (no 360°). Placeholder hasta que
  // llegue la foto real de la fachada de Arica (~15 jun 2026): la escena
  // `facade` la usa como backdrop si el archivo existe, y cae a la tarjeta
  // de marca si 404ea. Swappable sin tocar el resto de la experiencia.
  facade: `${BASE}brand/facade.jpg`,
} as const;

/**
 * Para assets cuyo path viene de data (aisles.json) con leading slash.
 * Normaliza al BASE de Vite — fundamental para no romper el deploy bajo /vr/.
 */
export function asset(p: string): string {
  return BASE + p.replace(/^\//, '');
}
