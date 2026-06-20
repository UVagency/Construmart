# Construmart · Conoce la Tienda Antes de que Abra — **Mobile**

Recorrido 360° de la reinauguración de la tienda Construmart Arica, para **celular**, servido en la raíz del dominio: **https://construmart.uv.agency/**

El usuario abre la experiencia en el teléfono (vía QR), entra a la tienda y recorre **6 pasillos** en 360° moviendo el celular (giroscopio) y tocando los botones de navegación, hasta la pantalla final de "recorrido completo".

Es el **port a mobile** del proyecto madre VR `UVagency/construmart-vr` (la misma experiencia para Meta Quest 2, servida bajo `/vr` desde ese otro repo). La diferencia central: la VR selecciona por **mirada + dwell**; acá la selección es por **tap**. La navegación espacial se mantiene idéntica (el "PASILLO ANTERIOR" queda a tus espaldas: te das vuelta con el teléfono y lo tocás).

## Stack

- **Vite + TypeScript**
- **A-Frame 1.5** (escena 360° declarativa)
- Tipografía **MSDF** (Barlow Condensed + Inter), panorámicas optimizadas en 3 niveles de resolución, Google Analytics 4.

## Desarrollo

```bash
npm install
npm run dev       # https://0.0.0.0:5173  (cert self-signed; HTTPS es obligatorio para el giroscopio)
npm run build     # tsc + vite build → dist/
npm run preview   # sirve el build sobre HTTPS para probar en el celular por LAN
```

Probar en celular: abrir la URL `Network:` que imprime Vite (`https://<IP-LAN>:5173/`) desde el teléfono en la misma Wi-Fi y aceptar el cert una vez.

## Documentación

Ver **[`CLAUDE.md`](./CLAUDE.md)** para la arquitectura completa (router, escenas, pipeline de panorámicas/fuentes, deploy) y, sobre todo, la sección **"Relationship to the VR mother repo"**: lista exactamente qué archivos divergen del repo madre, para re-portar cambios sin romper la paridad.

## Deploy

Productivo: VPS con Caddy desde `/var/www/construmart`, vía [`deploy.sh`](deploy.sh) en el servidor (`git pull` → `npm run build` → `rsync dist/`). El repo madre VR deploya aparte a `/var/www/construmart-vr/` bajo `/vr` — no mezclar los dos rsync `--delete`.
