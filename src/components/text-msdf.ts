/**
 * Helper para crear un `<a-text>` que renderiza correctamente con un atlas MSDF
 * custom servido como .fnt + .png (Barlow Condensed / Inter generados con
 * msdf-bmfont-xml).
 *
 * A-Frame text component por defecto debería detectar el `<distanceField
 * fieldType="msdf">` del .fnt y usar el msdf-shader — pero en la práctica, con
 * .fnt fetched async desde URL custom, la detección falla y el componente cae
 * al bitmap shader → los glifos se ven como rectángulos sólidos (alpha-based).
 *
 * Forzamos `shader: msdf` y `negate: false` explícitos. Esto es la única
 * combinación que decodifica los 3 canales del MSDF atlas y devuelve el
 * shape correcto del glifo.
 */
import { FONTS } from '../theme';

type FontKey = keyof typeof FONTS;

export interface TextOpts {
  value: string;
  font?: FontKey;
  color?: string;
  width?: number;
  letterSpacing?: number;
  wrapCount?: number;
  align?: 'left' | 'center' | 'right';
  opacity?: number;
  baseline?: 'top' | 'center' | 'bottom';
}

export function makeText(opts: TextOpts): HTMLElement {
  const el = document.createElement('a-text');
  // Empaquetar todo en un setAttribute('text', ...) garantiza que A-Frame
  // aplique los params en una sola pasada (no parcial por mid-init).
  const fontPath = FONTS[opts.font ?? 'body'];
  const props: string[] = [
    `value: ${opts.value}`,
    `font: ${fontPath}`,
    `shader: msdf`,
    `negate: false`,
    `align: ${opts.align ?? 'center'}`,
    `width: ${opts.width ?? 4}`,
    `color: ${opts.color ?? '#FFFFFF'}`,
  ];
  if (opts.letterSpacing !== undefined) props.push(`letterSpacing: ${opts.letterSpacing}`);
  if (opts.wrapCount !== undefined) props.push(`wrapCount: ${opts.wrapCount}`);
  if (opts.opacity !== undefined) props.push(`opacity: ${opts.opacity}`);
  if (opts.baseline) props.push(`baseline: ${opts.baseline}`);
  el.setAttribute('text', props.join('; '));
  return el;
}
