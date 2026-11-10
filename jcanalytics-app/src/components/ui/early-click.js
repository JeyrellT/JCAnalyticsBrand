// ============================================================================
//  src/components/ui/early-click.js
//  El clic a WhatsApp hecho antes de que la página fuera interactiva.
//
//  Entre la primera pintura (HTML estático) y el montaje de React pasan entre
//  0,4 s y más de 1 s en un celular lento. Quien toca el botón verde en esa
//  ventana es la visita más decidida, y antes no quedaba medida; en computadora
//  además se iba a WhatsApp Web, justo lo que la regla por dispositivo evita
//  (segunda ronda de la auditoría, noviembre de 2026).
//
//  Un script en línea de index.html guarda ese clic en `window.__jcEarly` y, en
//  computadora, lo detiene. Acá, con la página ya montada:
//    · computadora: se repite el clic sobre el mismo botón (por su etiqueta
//      estable), que ahora abre el formulario corto y se mide como siempre;
//    · celular: WhatsApp ya se abrió; solo se registra la intención.
// ============================================================================
import { isDesktopPointer } from '../../hooks/useDesktop';
import { trackContactLink } from '../../seo/analytics';

const MAX_AGE_MS = 30000; // un clic más viejo ya no es «el de recién»

export function replayEarlyClick() {
  if (window.__jcMounted) return;
  window.__jcMounted = true;
  const early = window.__jcEarly;
  window.__jcEarly = null;
  if (!early?.label || Date.now() - early.at > MAX_AGE_MS) return;
  const link = [...document.querySelectorAll('a[href^="https://wa.me/"]')].find((node) => node.dataset.trackLabel === early.label);
  if (!link) return;
  if (isDesktopPointer()) link.click();
  else trackContactLink(link);
}
