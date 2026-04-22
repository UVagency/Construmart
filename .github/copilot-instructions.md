# Construmart Copilot Instructions

> **Project**: Historias de pasillo (interactive web-AR promotional activation for Construmart)  
> **Branch conventions**: Feature branches use `feat/`, bug fixes use `fix/`  
> **Language**: Spanish UI, comments, and documentation

## Quick Start

```bash
npm install      # Install dependencies
npm run dev      # Start dev server on http://localhost:5173
npm run build    # Production build → dist/ (ready for Netlify)
npm run preview  # Preview built output locally
```

**No environment setup required for UI iteration** — the app runs offline with graceful Supabase degradation if `.env` is missing. For full backend integration, copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

## Project Architecture

Construmart is a **multi-page SPA** (single-page app) built with Vite + vanilla ES6 modules + A-Frame for 360° WebXR experiences. The user journey:

1. **Landing** (`index.html` / `/`) — Lead capture (email/phone optional) + iOS motion permission request
2. **Experience** (`experience.html`) — 360° panoramic aisle navigation with 4 interactive hotspots
3. **Success** (`success.html?code=XXX`) — Coupon display + QR code for mobile saving

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Build** | Vite 5.4+ | Zero-config, ES6 modules, dev server on port 5173 |
| **Runtime** | Vanilla JS (ES6) | Dynamic imports for code-splitting; no framework overhead |
| **3D/WebXR** | A-Frame 1.5 | Declarative WebXR, equirectangular 360° images |
| **Styling** | Tailwind CSS 3.4 | Custom color tokens: `uv-*` (UV Agency), no custom components yet |
| **Backend** | Supabase (PostgreSQL + Edge Fns) | Optional; app degrades gracefully offline |
| **QR Codes** | qrcode v1.5.4 | Client-side generation, embedded in coupon image |
| **Hosting** | Netlify | Redirects via `netlify.toml` for SPA clean URLs |

## Key Files & Responsibilities

| File | Purpose | When to Edit |
|------|---------|--------------|
| [`src/main.js`](../src/main.js) | Router + page initialization + lead form flow | Adding new pages, lead form fields, motion permission logic |
| [`src/game.js`](../src/game.js) | Hotspot interaction, session tracking, find countdown | Hotspot click logic, win conditions, state transitions |
| [`src/supabase.js`](../src/supabase.js) | Supabase client + offline fallback | Database calls, session/find logging |
| [`src/coupon-image.js`](../src/coupon-image.js) | Canvas-based coupon rendering + QR generation | Coupon design, QR format, mobile save functionality |
| [`src/styles.css`](../src/styles.css) | Base styles + Tailwind directives + A-Frame scene fixes | Global styles, custom utilities, animation fixes |
| [`index.html`](../index.html) | Landing page template | Lead form structure, favicon, meta tags |
| [`experience.html`](../experience.html) | A-Frame 360° scene with hotspots | Hotspot positions, image src, entity events |
| [`success.html`](../success.html) | Coupon success page template | Coupon display logic, share buttons |
| [`tailwind.config.js`](../tailwind.config.js) | Tailwind theme + custom colors | Adding/modifying color tokens (e.g., `uv-orange`, `cm-navy`) |
| [`vite.config.js`](../vite.config.js) | Build config + aliases | Build optimization, module resolution |

## Coding Conventions

### Language & Localization
- **All UI text, comments, and variable names are in Spanish** (e.g., `encontrado`, `aisleLogo`, `validarEmail`)
- HTML `lang="es"` in all pages
- If adding English comments, mark as `// EN: ...` for clarity

### Offline-First Design
- App must work **without** `.env` (Supabase variables optional)
- If Supabase client fails to initialize, use local session IDs: `local-${timestamp}`
- Generate placeholder coupon code: `UV-DEMO-${random}` when offline
- This philosophy enables rapid UI iteration without backend setup

### Tailwind & Styling
- Use built-in Tailwind utilities; avoid custom CSS unless necessary
- **Custom color tokens** for brand consistency:
  - `uv-orange` (#FE7F2D), `uv-teal` (#6BD8D7), `uv-dark` (#2C3E3C), `uv-cream` (#F5F6E8)
  - `cm-*` tokens reserved for Construmart-specific colors (define as needed)
- **Responsive**: Mobile-first; test on iPhone (portrait 375px, landscape 812px)
- **Dark mode**: Not yet in spec; add `dark:` prefixes if needed later

### A-Frame Scene Structure
- Use equirectangular 360° images (standard format for panoramic photos)
- Hotspots are `<a-entity>` with `data-hotspot-id` attribute
- Click handler: `game.js` listens for hotspot clicks and updates found state
- Event attributes use `aframe-event-set-component` for state animations

### State Management
- **SessionStorage** (`window.sessionStorage`) for lead data (email/phone) across page loads
- **LocalStorage** for user preferences (volume, motion enabled, etc.)
- No Redux; Supabase session table is the source of truth for backend state
- Client-side session ID in `sessionStorage.getItem('sessionId')`

### Module Imports
- Use dynamic imports for lazy-loading (e.g., `game.js` loaded only on `experience.html`)
- Keep modules small and focused (single responsibility)
- Export named functions; avoid default exports when multiple functions

### Testing
- **No automated tests yet** (on roadmap for iteration 2)
- Manual testing: `npm run dev` + browser DevTools
- Performance baseline: target < 3s load time on 4G (Lighthouse)

## Supabase Integration

**Tables** (schema defined separately, see email setup docs):
- `sessions` — Tracks session ID, lead email/phone, user agent, timestamp
- `finds` — Logs each hotspot discovery (session_id, hotspot_id, timestamp)

**Edge Function** (TODO for iteration 2):
- `claim-coupon` — Validates coupon code, applies discount, updates session state

**Environment Variables**:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Offline Fallback**: If env vars are missing, `supabase.js` initializes with a no-op client that logs warnings but doesn't crash the app. Sessions are generated locally and coupons are placeholder codes.

## Common Development Tasks

### Adding a New Page
1. Create `.html` file in root (e.g., `results.html`)
2. Add route handler in [`src/main.js`](../src/main.js) `init()` function
3. Add navigation link on source page
4. Use Tailwind + inline styles (no new CSS files unless shared)

### Modifying Hotspots
1. Edit [`experience.html`](../experience.html) — update `<a-entity>` positions/labels
2. Update `game.js` hotspot IDs to match
3. Test in `npm run dev` with Firefox Reality or Chrome DevTools Mobile view

### Adding a Backend Feature (Supabase)
1. Ensure `.env` is configured with Supabase credentials
2. Add function to [`src/supabase.js`](../src/supabase.js)
3. Call from `main.js` or `game.js` with try/catch error handling
4. Test offline mode still works if network is unavailable

### Deploying to Netlify
```bash
# Option 1: CLI
netlify login
netlify deploy --build --prod

# Option 2: Git push (auto-deploy from GitHub)
# Netlify automatically triggers `npm run build` and deploys `dist/`
```

Set environment variables in Netlify **Site settings → Environment variables**.

## Common Pitfalls & Debugging

| Issue | Root Cause | Solution |
|-------|-----------|----------|
| Hotspot not clickable in A-Frame | Missing `listeners` attribute or wrong entity selector | Check browser console for click events; ensure `<a-entity>` has `cursor="rayOrigin: mouse"` parent |
| Coupon code missing on success page | `sessionStorage.sessionId` not set before redirect | Verify lead form or `game.js` writes session ID before navigation |
| Supabase tables empty after testing | Running offline (missing `.env`) generates local session IDs | Copy `.env.example` → `.env` + fill credentials + clear browser cache + restart dev server |
| Slow build / dev server | Large 360° image (>5MB) or Tailwind rebuild | Compress `.webp` to <2MB; ensure `tailwind.config.js` has optimal `content` patterns |
| iOS Safari motion permission denied | User rejected permission or not HTTPS | Motion API requires HTTPS in production (localhost works); app still runs without motion |

## Documentation & References

- **[README.md](../README.md)** — Setup, routes, structure, missing assets (TODOs)
- **[Experience.md blog post (if available)]** — Design decisions, user flow narrative
- **Supabase schema** — Email setup docs (referred to in BRIEF, pending availability)
- **A-Frame docs** — https://aframe.io/docs/1.5/ (for 360° scene modifications)
- **Tailwind docs** — https://tailwindcss.com/ (for utilities; custom tokens in [`tailwind.config.js`](../tailwind.config.js))

## Next Steps (Iteration 2 TODO)

- [ ] Implement `claim-coupon` Edge Function in `supabase/functions/`
- [ ] Add automated tests (unit + integration)
- [ ] Implement analytics dashboard (find heatmap by hotspot)
- [ ] Dark mode support (add Tailwind `dark:` prefixes)
- [ ] A/B testing for hotspot positions (UX research)

---

**Last updated**: 2026-04-21 · **Maintained by**: UV Agency  
**Issues/PRs**: Follow `feat/`, `fix/` branch naming; request review from team
