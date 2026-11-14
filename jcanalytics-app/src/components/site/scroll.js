// ============================================================================
//  src/components/site/scroll.js
//  Llevar la página hasta un elemento, respetando su `scroll-margin-top`.
//
//  En computadora el desplazamiento lo maneja Lenis (App.jsx), que al seguir un
//  ancla calcula el destino con la posición del elemento y nada más: no descuenta
//  la barra fija ni el margen de desplazamiento, y si el elemento todavía no
//  terminó su animación de entrada (viene 24 px más abajo) queda aún más arriba.
//  Por eso el enlace «Tu caso en una frase → paquete» dejaba el nombre de la
//  tarjeta debajo de la barra (segunda ronda de la auditoría, noviembre de 2026).
//  En celular pasaba algo parecido: al abrir una fila de la lista de paquetes se
//  cierra la que estaba abierta y la fila de destino sube después del salto.
//
//  `scrollToNode` se llama cuando el diseño ya es el final (después de desplegar
//  o abrir lo que haga falta) y usa la posición sin transformaciones.
// ============================================================================

let smooth = null; // (top, { instant }) => void · lo registra App.jsx mientras Lenis está activo

/** App.jsx registra acá el desplazamiento suave; devuelve la función que lo quita. */
export function registerSmoothScroll(scroller) {
  smooth = scroller;
  return () => { if (smooth === scroller) smooth = null; };
}

/** Posición del elemento en el documento, sin contar transformaciones (animaciones de entrada). */
const pageTop = (node) => {
  let top = 0;
  for (let element = node; element; element = element.offsetParent) top += element.offsetTop;
  return top;
};

/** Desplaza hasta `node` dejándolo debajo de la barra fija (su `scroll-margin-top`). */
export function scrollToNode(node, { instant = false } = {}) {
  if (!node) return;
  const margin = Number.parseFloat(window.getComputedStyle(node).scrollMarginTop) || 0;
  const top = Math.max(0, pageTop(node) - margin);
  if (smooth) { smooth(top, { instant }); return; }
  const calm = instant || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  window.scrollTo({ top, behavior: calm ? 'auto' : 'smooth' });
}

/** Después del próximo pintado: cuando React ya aplicó el cambio de estado que mueve el diseño. */
export const afterLayout = (action) => window.requestAnimationFrame(() => window.requestAnimationFrame(action));
