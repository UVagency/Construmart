/**
 * Aplica feedback visual al pasar el cursor/láser por encima:
 * escala suave + tinte de borde opcional.
 *
 * Uso: <a-entity hoverable></a-entity>  o  <a-entity hoverable="scale: 1.12"></a-entity>
 */
AFRAME.registerComponent('hoverable', {
  schema: {
    scale: { type: 'number', default: 1.08 },
    duration: { type: 'number', default: 140 },
  },
  init(this: any) {
    const el = this.el;
    const s = this.data.scale;
    const d = this.data.duration;

    // Flag idempotente: si el cursor cae justo en el borde y rebota
    // mouseenter/mouseleave por micro-movimiento de cabeza, no reescribimos
    // la animación cada frame (eso causaba el "titileo" en los tiles).
    let hovered = false;

    el.addEventListener('mouseenter', () => {
      if (hovered) return;
      hovered = true;
      el.setAttribute(
        'animation__hover',
        `property: scale; to: ${s} ${s} ${s}; dur: ${d}; easing: easeOutQuad`,
      );
    });

    el.addEventListener('mouseleave', () => {
      if (!hovered) return;
      hovered = false;
      el.setAttribute(
        'animation__hover',
        `property: scale; to: 1 1 1; dur: ${d}; easing: easeOutQuad`,
      );
    });
  },
});
