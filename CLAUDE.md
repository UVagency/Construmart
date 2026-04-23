# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Construmart · **Historias de pasillo** — web-AR promotional activation. User scans an in-store QR, explores a 360° aisle on their phone, taps 4 hidden hotspots, and receives a discount coupon to redeem at the register.

Language convention: **all UI text, variable names, comments and commit messages are in Spanish**. Mark non-Spanish comments with `// EN:` if needed. Branch prefixes: `feat/`, `fix/`.

## Commands

```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173 (host: true, LAN-accessible for mobile testing)
npm run build      # → dist/ (Netlify publish dir)
npm run preview    # Serve the built output locally
```

There is no test suite, linter, or typechecker configured. Manual testing is the norm (target: iPhone Safari + Android Chrome, mid-range, 4G).

## Architecture

**Multi-page app (not a SPA)** built with Vite + vanilla ES6 modules. Three HTML entry points are declared in [`vite.config.js`](vite.config.js) `rollupOptions.input`:

| Route | File | Role |
|---|---|---|
| `/` | `index.html` | Landing + optional lead capture + iOS motion permission request |
| `/experience.html` | `experience.html` | A-Frame 360° scene with 4 hotspots |
| `/success.html?code=XXX` | `success.html` | Coupon display with QR, "save as image", fullscreen-for-cashier mode |

[`src/main.js`](src/main.js) is the single shared entry loaded by all three HTML files; it dispatches on `window.location.pathname` and uses **dynamic imports** (`import('./game.js')`, `import('./coupon-image.js')`) so each page only pulls the JS it needs.

### A-Frame scene

- A-Frame 1.5 and `aframe-event-set-component` are loaded via **CDN `<script>` in `experience.html`**, not npm. Don't add them to `package.json`.
- Hotspots are `<a-entity class="hotspot clickable" data-id="N">` elements. Click wiring lives in [`src/game.js`](src/game.js) `initGame()` — it queries `.hotspot` and attaches listeners. If you add/remove hotspots, update `TOTAL_HOTSPOTS` in `game.js` and the `<span id="total">` in the HUD.
- The splash screen in `experience.html` has a **minimum visible duration** (`SPLASH_MIN_MS = 1200ms` in `main.js`) — intentional, don't shorten without reason (branding visibility even on fast loads).
- Camera uses `look-controls` with `touchEnabled` + `magicWindowTrackingEnabled`; iOS 13+ motion permission is requested in `main.js` `requestMotionPermission()` — must be triggered by a user tap (the landing "start" button).

### Coupon flow — current state (offline-only)

The Supabase client (`src/supabase.js`) was **removed**. Coupons are now picked client-side from a static pool at **`public/coupons.json`** (`{ codes: [...] }`) by `pickCoupon()` in `game.js`, with a `UV-DEMO-xxxxxx` fallback if the fetch fails. Session IDs are generated locally as `local-${Date.now()}`.

The `.env.example`, README, and `.github/copilot-instructions.md` still describe a Supabase integration as "iteration 2" — treat those as aspirational, not current. If reintroducing Supabase, keep the offline-degradation behavior (app must run without env vars).

### Success page UX (non-obvious)

The success page is designed **for construction workers at a cashier counter**: minimal reading, large tap targets, no typing. Two primary actions:
1. **Save coupon as image** — uses `navigator.share({ files: [...] })` (iOS/Android share sheet, surfaces "Save image" natively) and falls back to a direct download anchor. The canvas rendering + QR lives in [`src/coupon-image.js`](src/coupon-image.js).
2. **Fullscreen mode** — big QR for the cashier to scan; requests real fullscreen + `navigator.wakeLock` to force max brightness. Don't break either of these.

### Styling

Tailwind 3.4. Two brand palettes coexist in [`tailwind.config.js`](tailwind.config.js):

- **`cm-*`** — Construmart primary (navy `#041E42`, blue `#2A5DB9`, yellow `#FFB81C`). Use these for the main UI.
- **`uv-*`** — UV Agency, reserved for discreet co-branding (footer-level).

Fonts: `font-display` = Barlow Condensed (headings/labels), `font-sans` = Inter. Loaded from Google Fonts in each HTML file.

### Deployment

Netlify. [`netlify.toml`](netlify.toml) sets `npm run build` → `dist`, adds immutable cache headers for `/360/*` and `/assets/*`, and rewrites clean URLs `/experience` → `/experience.html`, `/success` → `/success.html` (status 200, so they preserve the URL). Keep those rewrites in mind when adding new pages.

## Assets (referenced but not committed)

These paths are referenced in HTML/code but the files don't exist yet — fetches will 404 in dev until supplied:

- `public/360/tienda-01.jpg` — equirectangular 360° store photo (target 4096×2048, <2MB as `.webp` if quality allows). A generic placeholder is used today.
- `public/assets/found.mp3`, `public/assets/complete.mp3` — SFX.

Hotspot positions in `experience.html` are placeholders keyed to the placeholder photo; they must be re-tuned once the real 360 image is dropped in.
