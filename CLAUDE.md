# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Construmart · **"Conoce la Tienda Antes de que Abra"** — the **mobile** 360° walkthrough of the re-inaugurated Construmart Arica store, served at the **domain root** `https://construmart.uv.agency/`. The user opens it on a phone (via QR), walks the storefront → enters the store → moves aisle-to-aisle through 6 aisles in 360°, and reaches a completion "credential" screen.

This repo is a **port of the VR project** `UVagency/construmart-vr` (the *mother* project — the same experience built for Meta Quest 2, served at `…/vr/` from that other repo). **Don't conflate the two.** The mother is VR/gaze; this one is **mobile/tap**. When the mother's scenes, panoramas, copy or flow change, re-port the diff here (see "Relationship to the VR mother repo").

Language convention: **all UI text, variable names, comments and commit messages are in Spanish**. Mark non-Spanish comments with `// EN:` if needed. Branch prefixes: `feat/`, `fix/`.

## Commands

```bash
npm install
npm run dev                 # Vite dev server on https://0.0.0.0:5173 (self-signed cert, host:true for LAN)
npm run build               # tsc (type-check, noEmit) then vite build → dist/
npm run preview             # Serve the production build over HTTPS for device testing
npm run optimize            # Re-encode panoramas/raw/*.{jpg,png,tiff} → public/panoramas/{name}.{jpg,webp,hi.webp} + lowres/
npm run gen-placeholders    # Regenerate synthetic 360° placeholders from aisles.json (only if a panorama is missing)
npm run fonts:fetch         # Download source TTFs (Barlow Condensed, Inter) into scripts/fonts-src/ (gitignored)
npm run gen-fonts           # Rebuild the MSDF font atlases in public/brand/fonts/ (needs fonts:fetch first)
```

**HTTPS in dev is mandatory, not cosmetic:** iOS `DeviceOrientation`/gyroscope requires a secure context, so magic-window look only works over HTTPS (or localhost). Accept the self-signed cert once per device. The only automated check is `npm run build` (runs `tsc` then `vite build`); it also runs in CI on push/PR to `main` (`.github/workflows/ci.yml`) — validation only, no deploy. No test suite, no linter. Manual testing is the norm (target: iPhone Safari + Android Chrome, mid-range, 4G).

## Architecture

**Single-page A-Frame app** (Vite + TypeScript, no React/Vue/router-lib). It swaps the DOM children of `#scene-root` (declared in `index.html`) when the route changes. A-Frame is the only runtime dep.

### Boot path
- `index.html` declares the persistent `<a-scene tap-select vr-mode-ui="enabled:false">` shell: `#rig` at (0,0,0) + `#camera` at y=1.6 (the comment explains the non-XR `user-height` double-count), a black `#fader` plane parented to the camera, and an empty `#scene-root` for swappable content. It also loads **Google Analytics 4** — the `experiencia` user-property is `mobile` at the root path (`/vr` ⇒ `vr`, which is the mother repo, not this one).
- `src/main.ts` imports `aframe` (registers globals + custom elements), the styles, the three components (`hoverable`, **`tap-select`**, `render-order`), then calls `router.init()`. Components must be imported **before** any markup using them.

### Interaction model: TAP (the core mobile port)
The VR mother selects by **gaze + dwell** (a center reticle with `cursor="fuse:true"`). This repo replaced that with **tap**:
- `src/components/tap-select.ts` — A-Frame component on `<a-scene>` (attribute `tap-select`). Manual raycaster against `.clickable`: on a *clean tap* (movement < `TAP_MAX_DIST` px, contact < `TAP_MAX_MS` ms) it dispatches `MouseEvent('click', {bubbles:true})` on the hit element, which bubbles to the button entity's `click` listener — so **the scenes are unchanged**. The drag/duration guard is why dragging to look around never misfires a button (A-Frame's native `cursor` with `rayOrigin:mouse` would).
- The gaze reticle + `gaze-cursor` component were removed; there is no center cursor.
- `hoverable` stays imported (scenes set it) but is inert on touch (no `mouseenter` without a cursor) — harmless.

**The spatial navigation is preserved exactly as in VR**, on purpose (product decision): the nav buttons live in **world space**, and `PASILLO ANTERIOR` is positioned *behind the user* (`navmenu.ts` `PREV_POS = '0 2.645 4.44'`, rotated 180°). On mobile the user physically turns the phone around (gyro/drag) to find it and taps it. Don't move nav buttons onto a fixed 2D HUD without checking with the team.

### Routing & state (`src/state/`)
- `router.ts` — three routes: `facade` | `aisle` | `credential`. **No menu/home**: a continuous walkthrough. Entry is `facade`. The walkthrough is a `stops` array = `[HALL, ...aisles]`; `HALL` is the `acceso` panorama (entrance, `counts:false` — landing spot, doesn't count toward the 6). `enterStore()` (facade ENTRAR) and `glideAisle(id, dir)` (the arrows) are custom non-fade "fly" transitions; prev/next come from `stops` order. Last aisle + tour complete ⇒ "next" becomes the credential CTA.
- `progress.ts` — `Set` of visited aisle ids in `localStorage` (`construmart-vr-progress`). An aisle counts **on entry** (no hotspots to click), but only `counts:true` stops (the hall is skipped). Reset lives on the **facade** ("Reiniciar recorrido") for hand-to-hand field use, and after the credential.
- `camera.ts` — `setLookControlsEnabled()` (off on facade/credential so the composition stays fixed; on in aisles for free 360° look) and `resetLookOrientation()` (zero yaw/pitch on aisle entry so you land facing the corridor).
- `transition.ts` — `fadeIn/fadeOut` (the `#fader` plane) and `flyThrough(oldSky, newSky, dir)` (the no-black aisle move: camera stays, the sky **spheres** move, shrunk to `FLY_RADIUS` to amplify optical flow).
- `motion.ts` — `requestMotionPermission()` (iOS 13+ `DeviceOrientation/Motion.requestPermission`). **Mobile-only addition**, called from the facade ENTRAR tap (the required user gesture) so the aisles' gyro works on iOS. No-op elsewhere; never blocks the flow.
- `preload.ts` — warms the HTTP cache of all panoramas (standard tier then hi-res) while the user is on the facade, so entering/moving is instant on bad job-site connectivity.
- `analytics.ts` — thin GA4 `track()` wrapper; silent no-op if gtag is absent.

### Scenes (`src/scenes/`)
Each `render*(root, …, callbacks)` builds A-Frame entities imperatively and appends to the root. Scenes **never import the router or progress** — they take callbacks; `router.ts` is the one place wiring callbacks to navigation/progress. Keep that boundary.
- `facade.ts` — flat welcome splash (brand card over navy). ENTRAR (`requestMotionPermission()` then `onEnter` ⇒ `enterStore()`) and the "Reiniciar recorrido" reset. Look-controls off.
- `aisle.ts` — `createAisleSky()` paints the `<a-sky>` and runs progressive panorama load (`placeholderColor` → standard `.webp`/`.jpg` → background upgrade to `.hi.webp`). `buildAisleHuds()` mounts the nav menu + prev/next.
- `navmenu.ts` — world-space nav HUD. Collapsed `[← ANTERIOR] (C) [SIGUIENTE →]`; expand the C ⇒ 6 aisle tiles (direct access) + a discreet SALIR. Dynamic content is **rebuilt** on toggle (the raycaster doesn't cull invisible `.clickable`). `?tune` in the URL shows the dev heading calibrator.
- `credential.ts` — completion screen ("6/6" badge, return-to-start CTA).

### Components & theme
- `src/components/text-msdf.ts` — **not** a component; `makeText()` builds an `<a-text>` forcing `shader: msdf; negate: false`. Without those, custom `.fnt` atlases fall back to the bitmap shader and glyphs render as solid rectangles. **Always create text through `makeText()`.**
- `src/components/render-order.ts` / `hoverable.ts` — render-order helper / hover-scale (inert on touch).
- `src/theme.ts` — brand tokens (navy `#041E42`, blue `#2A5DB9`, yellow `#FFB81C`), font/asset URLs, and the `asset()` helper. **Every asset path must go through `theme.ts`'s `BASE_URL` prefixing** (`FONTS`/`ASSETS` or `asset(path)`). Here `BASE_URL` is `/` (root); hardcoded `/brand/...` happens to work too, but keep using `asset()` for portability with the mother repo.

### Data model (`src/data/aisles.json`, typed by `src/types.ts`)
The 6 aisles: `id`, `name`, `panorama`, `placeholderColor`, optional **`heading`** (degrees, rotates the `<a-sky>` so the corridor faces front `-Z` on landing). **Aisle names and panorama paths stay data-driven** — don't hardcode them in scenes. No hotspots (removed with the gaze-only refactor in the mother).

### Panorama & font pipelines
- `public/panoramas/` ships the real shoot output, four artifacts per aisle: `name.jpg` (4096×2048), `name.webp`, `name.hi.webp` (native, background upgrade), `lowres/name.jpg`. Raw masters drop into `panoramas/raw/{id}.jpg` (gitignored) and `npm run optimize` (sharp) regenerates them. Names must match aisle ids. Budget: standard webp < 2 MB, hi-res < 3 MB (job-site connectivity).
- Text uses MSDF atlases in `public/brand/fonts/` (`.fnt` + `.png`, committed). To add glyphs: edit `scripts/charset-es.txt`, then `npm run fonts:fetch && npm run gen-fonts`. The charset already covers full Spanish; a missing glyph renders as nothing.

## Deployment — construmart.uv.agency (root)

Served by Caddy from `/var/www/construmart` on the VPS. Deploy with [`deploy.sh`](deploy.sh) **on the server**: `git pull --ff-only` → `npm run build` → `rsync -a --delete dist/ /var/www/construmart/` (`FORCE=1` rebuilds without a new commit). `base` is `/` (this is the root site). The VR mother deploys separately to `/var/www/construmart-vr/` and is wired through Caddy's `handle_path /vr/*` — **the two `--delete` rsyncs must stay on separate disk paths; don't merge them.** `netlify.toml` is kept as a fallback config only.

## Relationship to the VR mother repo (`UVagency/construmart-vr`)

This repo is a **fork-by-copy** of the mother, diverging only where mobile needs it. When porting future changes from the mother, these are the **only files that intentionally differ** — re-apply the mother's changes everywhere else verbatim:

| File | Divergence from the mother |
|---|---|
| `index.html` | `vr-mode-ui="enabled:false"`, `tap-select` on `<a-scene>`, gaze reticle removed |
| `src/main.ts` | imports `tap-select` instead of `gaze-cursor` |
| `src/components/tap-select.ts` | **new** (replaces `gaze-cursor.ts`, which is absent here) |
| `src/state/motion.ts` | **new** (iOS gyro permission) |
| `src/scenes/facade.ts` | ENTRAR requests motion permission; hint copy "Tocá para entrar" |
| `vite.config.ts` | `base: '/'` always (mother uses `/vr/` on build) |
| `package.json` | name `construmart-mobile` |

Everything else (scenes, router, transitions, theme, panoramas, fonts, optimize/font scripts) is a straight copy — change it in the mother first when it's shared behavior, then re-port.
