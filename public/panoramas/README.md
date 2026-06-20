# Panorámicas 360°

Las panorámicas finales se toman el **25-26 mayo 2026** en una tienda Construmart existente (e.g. La Florida).

## Estructura esperada

Un archivo por pasillo, formato equirectangular (relación 2:1):

- `electrico.jpg`
- `gasfiteria.jpg`
- `madera.jpg`
- `jardin.jpg`
- `construccion.jpg`
- `ferreteria.jpg`

## Mientras no estén

Si el archivo no existe, la escena cae al `placeholderColor` definido en `src/data/aisles.json`. Para development se pueden descargar panorámicas CC0 de [Polyhaven HDRIs](https://polyhaven.com/hdris) y renombrar.

## Optimización (target para producción)

- Resolución máxima: 4096×2048 (lujo) o 2048×1024 (estándar)
- Formato: JPEG calidad 80–85, o WebP/AVIF si el browser del Quest 2 los soporta
- Peso objetivo: < 2 MB por panorámica
- Considerar tiled cube maps si el peso del equirect resulta excesivo
