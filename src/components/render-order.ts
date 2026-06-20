/**
 * Componente `render-order`: fija el `renderOrder` del object3D del entity (y de
 * sus hijos) en three.js.
 *
 * A-Frame NO trae este componente de fábrica, así que los atributos
 * `render-order="100"` del index.html eran un no-op y el orden de dibujo dependía
 * solo de la distancia. Lo necesitamos para que el reticle (cursor) y el fader se
 * dibujen SIEMPRE al final — por delante de los botones del menú — de forma
 * determinística. Combinado con `depthTest: false; depthWrite: false; transparent:
 * true` en el material, da el clásico "siempre al frente" para overlays/HUD.
 *
 * Re-aplica en `object3dset` porque la malla puede crearse async (geometría) o
 * recrearse (p. ej. la animación de thetaLength del anillo de progreso).
 */
AFRAME.registerComponent('render-order', {
  schema: { type: 'number', default: 0 },

  init(this: any) {
    this.apply = this.apply.bind(this);
    this.apply();
    this.el.addEventListener('object3dset', this.apply);
  },

  update(this: any) {
    this.apply();
  },

  apply(this: any) {
    const order = this.data as number;
    this.el.object3D.traverse((o: any) => {
      o.renderOrder = order;
    });
  },
});
