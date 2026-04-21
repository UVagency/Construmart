# Prompt inicial para Claude Code

Copiá esto y pegalo en Claude Code como primer mensaje:

---

Necesito que armes el scaffolding de un proyecto web AR para una activación promocional. Leé `BRIEF.md` en la raíz del repo para el contexto completo.

**Tareas de esta primera iteración:**

1. Inicializá el proyecto con Vite (vanilla JS, no React)
2. Instalá dependencias: `@supabase/supabase-js`, `tailwindcss`, `autoprefixer`, `postcss`
3. Configurá Tailwind con la paleta UV Agency:
   - Primary orange: `#FE7F2D`
   - Teal: `#6BD8D7`
   - Dark: `#2C3E3C`
   - Cream: `#F5F6E8`
4. Creá los 3 HTML base (`index.html`, `experience.html`, `success.html`) con el código del brief
5. Implementá `src/game.js` y `src/main.js` según el brief
6. Creá `.env.example` con las vars de Supabase
7. Armá un README con instrucciones de setup y deploy a Netlify
8. Agregá una foto 360 placeholder en `public/360/tienda-01.jpg` (usá una imagen equirectangular de muestra que bajes o generes)

**Al terminar:**
- Corré `npm run dev` y verificá que la escena A-Frame carga
- Mostrame los hotspots visibles sobre la escena
- Dejá comentarios `// TODO:` en los puntos donde necesite configurar credenciales o assets reales

**No hagas todavía:**
- Edge function de Supabase (la hacemos en segunda iteración)
- Deploy a producción
- Integración con datos reales del cliente

Empezá.
