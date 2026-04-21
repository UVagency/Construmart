# Construmart AR Scavenger Hunt — Brief Técnico

## Contexto

Activación promocional en tienda Construmart (piloto 1 sucursal). Los usuarios escanean un QR en la tienda, se abre una experiencia inmersiva 360° en el browser de su celular, buscan objetos ocultos entre los productos, y al encontrarlos todos reciben un código de descuento.

**Sin app. Web-based. Mobile-first. Gama media.**

---

## Stack

### Frontend
- **A-Frame** (`aframe.io`) — framework WebXR declarativo basado en Three.js
- **aframe-event-set-component** — para animaciones de hotspots
- **Vanilla JS** para lógica del juego (no necesita React)
- **Tailwind CSS** para UI (overlay, modales, premio)
- **Vite** como build tool

### Backend
- **Supabase** (free tier alcanza para piloto)
  - Tabla `sessions` (tracking de cada partida)
  - Tabla `completions` (usuarios que terminaron + lead data)
  - Tabla `coupons` (pool de códigos únicos pre-generados)
- **Edge Function** para validar completion y asignar cupón

### Hosting
- **Netlify** o **Vercel** (free tier)
- Dominio tipo `ar.construmart.cl` o subdominio UV

---

## Arquitectura

```
[QR en tienda]
    ↓
[Landing page: "¡Bienvenido! Toca para empezar"]
    ↓
[Captura email/teléfono opcional pre-juego para lead gen]
    ↓
[A-Frame scene con foto 360° equirectangular]
    ↓
[4-5 hotspots invisibles/semi-visibles sobre la imagen]
    ↓
[Usuario toca hotspot → animación + contador ++]
    ↓
[Al completar todos → llamada a Supabase]
    ↓
[Recibe código único + CTA canje en caja]
```

---

## Estructura de archivos

```
construmart-ar/
├── index.html              # Landing + captura lead
├── experience.html         # Scene A-Frame 360°
├── success.html            # Pantalla final con cupón
├── src/
│   ├── main.js             # Init + routing
│   ├── game.js             # Lógica de hotspots y contador
│   ├── supabase.js         # Cliente Supabase
│   └── styles.css          # Tailwind + custom
├── public/
│   ├── 360/
│   │   └── tienda-01.jpg   # Foto 360 equirectangular (4096x2048 mín)
│   ├── assets/
│   │   ├── hotspot.png     # Ícono hotspot (opcional, invisible mejor)
│   │   ├── found.mp3       # Sonido al encontrar
│   │   └── complete.mp3    # Sonido final
│   └── logo-construmart.svg
├── supabase/
│   └── functions/
│       └── claim-coupon/
│           └── index.ts    # Edge function
├── .env.example
├── vite.config.js
├── package.json
└── README.md
```

---

## Código base — A-Frame scene

```html
<!-- experience.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <title>Construmart AR Hunt</title>
  <script src="https://aframe.io/releases/1.5.0/aframe.min.js"></script>
  <script src="https://unpkg.com/aframe-event-set-component@5.0.0/dist/aframe-event-set-component.min.js"></script>
  <link rel="stylesheet" href="/src/styles.css">
</head>
<body>
  <!-- HUD Overlay -->
  <div id="hud" class="fixed top-0 left-0 right-0 z-10 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
    <div class="text-white font-bold">
      Encontrados: <span id="counter">0</span>/<span id="total">4</span>
    </div>
    <button id="help-btn" class="text-white text-sm underline">¿Cómo jugar?</button>
  </div>

  <!-- A-Frame Scene -->
  <a-scene vr-mode-ui="enabled: false" loading-screen="dotsColor: #FE7F2D; backgroundColor: #2C3E3C">
    <a-assets>
      <img id="sky360" src="/360/tienda-01.jpg" crossorigin="anonymous">
      <audio id="found-sfx" src="/assets/found.mp3" preload="auto"></audio>
    </a-assets>

    <!-- Skybox 360 -->
    <a-sky src="#sky360" rotation="0 -90 0"></a-sky>

    <!-- Hotspots (posicionados en coordenadas esféricas) -->
    <a-entity id="hotspot-1"
              class="hotspot clickable"
              geometry="primitive: sphere; radius: 0.3"
              material="color: #FE7F2D; opacity: 0.4; transparent: true"
              position="3 1 -5"
              animation="property: scale; to: 1.2 1.2 1.2; dir: alternate; dur: 1000; loop: true"
              data-id="1">
    </a-entity>

    <a-entity id="hotspot-2" class="hotspot clickable"
              geometry="primitive: sphere; radius: 0.3"
              material="color: #FE7F2D; opacity: 0.4; transparent: true"
              position="-4 0.5 -3"
              data-id="2">
    </a-entity>

    <a-entity id="hotspot-3" class="hotspot clickable"
              geometry="primitive: sphere; radius: 0.3"
              material="color: #FE7F2D; opacity: 0.4; transparent: true"
              position="2 -1 4"
              data-id="3">
    </a-entity>

    <a-entity id="hotspot-4" class="hotspot clickable"
              geometry="primitive: sphere; radius: 0.3"
              material="color: #FE7F2D; opacity: 0.4; transparent: true"
              position="-3 2 3"
              data-id="4">
    </a-entity>

    <!-- Camera con cursor para mobile tap -->
    <a-entity camera look-controls="touchEnabled: true; magicWindowTrackingEnabled: true"
              position="0 1.6 0">
      <a-cursor raycaster="objects: .clickable" visible="false"></a-cursor>
    </a-entity>
  </a-scene>

  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

---

## Lógica del juego (game.js)

```javascript
// src/game.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

const TOTAL_HOTSPOTS = 4;
const found = new Set();
let sessionId = null;

export async function initGame() {
  // Crear sesión en Supabase
  const { data } = await supabase
    .from('sessions')
    .insert({ 
      started_at: new Date().toISOString(),
      user_agent: navigator.userAgent 
    })
    .select()
    .single();
  
  sessionId = data.id;

  // Attach listeners a hotspots
  document.querySelectorAll('.hotspot').forEach(el => {
    el.addEventListener('click', () => handleHotspotClick(el));
  });
}

async function handleHotspotClick(el) {
  const id = el.dataset.id;
  if (found.has(id)) return;

  found.add(id);
  
  // Feedback visual
  el.setAttribute('material', 'color: #6BD8D7; opacity: 0.8');
  el.setAttribute('animation__found', 
    'property: scale; to: 0.01 0.01 0.01; dur: 500; easing: easeInQuad'
  );
  
  // SFX
  document.querySelector('#found-sfx').components.sound?.playSound();
  
  // Update HUD
  document.getElementById('counter').textContent = found.size;
  
  // Log hallazgo
  await supabase.from('finds').insert({
    session_id: sessionId,
    hotspot_id: id,
    found_at: new Date().toISOString()
  });

  // ¿Completó?
  if (found.size === TOTAL_HOTSPOTS) {
    setTimeout(() => completeGame(), 800);
  }
}

async function completeGame() {
  // Llamar edge function para claim del cupón
  const { data, error } = await supabase.functions.invoke('claim-coupon', {
    body: { session_id: sessionId }
  });

  if (error) {
    alert('Error al obtener cupón. Intentá de nuevo.');
    return;
  }

  // Redirect a success con código
  window.location.href = `/success.html?code=${data.coupon_code}`;
}
```

---

## Schema Supabase

```sql
-- Sessions (cada partida)
create table sessions (
  id uuid primary key default gen_random_uuid(),
  started_at timestamptz default now(),
  completed_at timestamptz,
  user_agent text,
  email text,
  phone text,
  coupon_code text
);

-- Finds (cada hotspot encontrado)
create table finds (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id),
  hotspot_id text not null,
  found_at timestamptz default now()
);

-- Pool de cupones pre-generados
create table coupons (
  code text primary key,
  claimed boolean default false,
  claimed_by uuid references sessions(id),
  claimed_at timestamptz
);

-- RLS: el anon key solo puede insertar, no leer cupones
alter table sessions enable row level security;
alter table finds enable row level security;
alter table coupons enable row level security;

create policy "anon can insert sessions" on sessions 
  for insert to anon with check (true);
create policy "anon can update own session" on sessions 
  for update to anon using (true);
create policy "anon can insert finds" on finds 
  for insert to anon with check (true);
-- coupons: solo se accede vía edge function con service_role
```

---

## Edge Function — claim-coupon

```typescript
// supabase/functions/claim-coupon/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { session_id } = await req.json();
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Validar que la sesión completó los 4 hotspots
  const { count } = await supabase
    .from('finds')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', session_id);

  if (count < 4) {
    return new Response(JSON.stringify({ error: 'incomplete' }), { status: 400 });
  }

  // Verificar que no haya reclamado ya
  const { data: session } = await supabase
    .from('sessions')
    .select('coupon_code')
    .eq('id', session_id)
    .single();
  
  if (session?.coupon_code) {
    return new Response(JSON.stringify({ coupon_code: session.coupon_code }));
  }

  // Tomar cupón disponible
  const { data: coupon } = await supabase
    .from('coupons')
    .select('code')
    .eq('claimed', false)
    .limit(1)
    .single();

  if (!coupon) {
    return new Response(JSON.stringify({ error: 'no_coupons_left' }), { status: 410 });
  }

  // Marcar claimed + asignar a sesión
  await supabase.from('coupons').update({
    claimed: true,
    claimed_by: session_id,
    claimed_at: new Date().toISOString()
  }).eq('code', coupon.code);

  await supabase.from('sessions').update({
    completed_at: new Date().toISOString(),
    coupon_code: coupon.code
  }).eq('id', session_id);

  return new Response(JSON.stringify({ coupon_code: coupon.code }), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## Checklist de producción

### Pre-desarrollo
- [ ] Confirmar tienda piloto con Construmart
- [ ] Agendar sesión de foto 360 (cámara Insta360 o similar, ~2-3 hs)
- [ ] Definir objetos a esconder (4-5 items relacionados a productos destacados)
- [ ] Definir premio (% descuento, monto, producto gratis, etc.)
- [ ] Aprobar copy del flujo con cliente

### Desarrollo
- [ ] Setup repo + Vite + A-Frame
- [ ] Supabase project + schema + RLS
- [ ] Edge function `claim-coupon` + deploy
- [ ] Landing + captura lead
- [ ] Scene A-Frame con foto 360
- [ ] Posicionar hotspots (requiere iteración sobre la foto real)
- [ ] HUD + feedback visual/sonoro
- [ ] Pantalla success con cupón
- [ ] Generar pool de cupones únicos
- [ ] QR apuntando al dominio

### QA
- [ ] Test en iPhone (Safari) — gama media (iPhone 11+)
- [ ] Test en Android (Chrome) — gama media (Snapdragon 6xx+)
- [ ] Verificar giroscopio funciona (permisos iOS)
- [ ] Test con conexión 4G lenta (tamaño foto 360)
- [ ] Test flujo completo end-to-end
- [ ] Validar que no se puede ganar dos veces con misma sesión

### Pre-lanzamiento
- [ ] Material POP con QR en tienda
- [ ] Briefing a equipo de caja (cómo validar cupones)
- [ ] Dashboard simple para cliente (métricas en Supabase)
- [ ] Plan de backup si servidor cae (cupón genérico impreso)

---

## Métricas a trackear

- Sesiones iniciadas
- % completion rate (finds === 4)
- Tiempo promedio de completion
- Hotspot más/menos encontrado (calibrar dificultad)
- Cupones canjeados en tienda (requiere cruce con POS)
- Leads capturados

---

## Consideraciones técnicas importantes

1. **iOS requiere permiso explícito de giroscopio** (DeviceMotionEvent.requestPermission) — hay que pedirlo con un tap del usuario, no se puede auto.
2. **Foto 360 pesa** — optimizar a ~1-2MB máx con compresión. Considerar `.webp` si quality aguanta.
3. **Posicionamiento de hotspots** es iterativo — probablemente necesites un modo "edit" para que Christopher pueda mover los hotspots visualmente sin tocar código.
4. **Pool de cupones** — generar 2x el volumen esperado para margen.
5. **Cache busting** — si cambias posición de hotspots, versionar la URL.

---

## Siguientes pasos

1. Christopher arranca setup del repo con esta base
2. En paralelo: contratar fotógrafo 360 + definir día de shoot en tienda
3. Primera demo interna en 2 semanas con foto placeholder
4. Demo a Construmart en 3-4 semanas
