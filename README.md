# Construmart · Historias de pasillo

Activación promocional web-AR para Construmart (piloto 1 sucursal). Campaña **"Historias de pasillo"**: el usuario escanea un QR en tienda, recorre el pasillo en 360° desde el browser del celular, destapa 4 "historias" escondidas entre los productos y recibe un cupón de descuento para canjear en caja.

Ver [`BRIEF.md`](./BRIEF.md) para el contexto completo, arquitectura y schema de Supabase.

## Stack

- **Vite** (vanilla JS)
- **A-Frame 1.5** (WebXR declarativo) + `aframe-event-set-component`
- **Tailwind CSS** (paleta UV Agency)
- **Supabase** (tracking + cupones, iteración 2)

## Setup local

```bash
# 1. Instalar deps
npm install

# 2. Configurar env (opcional hasta tener Supabase listo)
cp .env.example .env
# editar .env con VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY

# 3. Dev server
npm run dev
# → http://localhost:5173
```

Sin `.env` el juego corre en **modo offline**: no persiste sesiones y al completar los 4 hotspots redirige a `/success.html` con un código placeholder (`UV-DEMO-XXXXXX`). Útil para iterar la UI sin backend.

## Rutas

| Ruta | Pantalla |
|------|----------|
| `/` | Landing + captura de lead opcional |
| `/experience.html` | Escena A-Frame 360° con hotspots |
| `/success.html?code=XXX` | Pantalla final con cupón |

## Estructura

```
.
├── index.html              # Landing
├── experience.html         # Scene A-Frame 360°
├── success.html            # Cupón
├── src/
│   ├── main.js             # Router + init por página
│   ├── game.js             # Lógica de hotspots + contador
│   ├── supabase.js         # Cliente (modo offline si no hay env)
│   └── styles.css          # Tailwind + custom
├── public/
│   ├── 360/tienda-01.jpg   # Foto equirectangular (placeholder por ahora)
│   └── assets/             # SFX + íconos
├── supabase/functions/     # Edge functions (iteración 2)
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── netlify.toml
```

## Paleta UV Agency (Tailwind)

| Token | Hex |
|-------|-----|
| `uv-orange` | `#FE7F2D` |
| `uv-teal` | `#6BD8D7` |
| `uv-dark` | `#2C3E3C` |
| `uv-cream` | `#F5F6E8` |

## Assets que faltan (TODOs reales)

- [ ] `public/360/tienda-01.jpg` → hoy es placeholder genérico, reemplazar por foto 360 real de la tienda (equirectangular, 4096×2048 mín, ~1–2 MB con compresión `.webp` si quality aguanta).
- [ ] `public/assets/found.mp3` → sonido al encontrar hotspot.
- [ ] `public/assets/complete.mp3` → sonido al completar.
- [ ] `public/logo-construmart.svg` → logo en landing.
- [ ] Posiciones finales de hotspots en `experience.html` — iterar sobre la foto real.

## Deploy a Netlify

### Opción A — CLI (recomendada para primera vez)

```bash
npm install -g netlify-cli
netlify login
netlify init        # creá un nuevo site o linkealo con uno existente
netlify deploy --build --prod
```

### Opción B — Git + UI

1. Push del repo a GitHub.
2. En Netlify: **Add new site → Import an existing project** → pickear el repo.
3. Build command: `npm run build` · Publish directory: `dist` (ya configurado en `netlify.toml`).
4. **Site settings → Environment variables**: agregar
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Trigger deploy.

### Dominio

Apuntar `ar.construmart.cl` (o subdominio UV) a Netlify:
- **Domain management → Add custom domain**
- Seguir instrucciones de DNS (CNAME a `<site>.netlify.app` o usar Netlify DNS).

## Iteración 2 — pendiente

- [ ] Supabase project: schema (ver `BRIEF.md`) + RLS.
- [ ] Edge function `claim-coupon` (código en brief) + deploy con `supabase functions deploy claim-coupon`.
- [ ] Generar pool de cupones únicos (2× el volumen esperado).
- [ ] Foto 360 real + reposicionamiento de hotspots.
- [ ] QR apuntando al dominio productivo.

## QA checklist (mobile)

- iPhone (Safari) gama media — permiso giroscopio se pide con tap del usuario.
- Android (Chrome) gama media.
- 4G lento — verificar tamaño de foto 360.
- Flujo end-to-end: landing → 4 hotspots → success → copiar cupón.
