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
//  Un script en línea de index.html guarda ese clic en `window.__jcEarly` y dice
//  si lo retuvo (`held`: computadora, clic simple). Acá, con la página ya montada:
//    · retenido: se repite el clic sobre el mismo botón (por su etiqueta
//      estable o, si cambió al montar, por su mensaje o su lugar), que ahora
//      abre el formulario corto y se mide como siempre;
//    · no retenido (celular, enlace directo, Ctrl+clic): WhatsApp ya se abrió;
//      solo se registra, sin abrir nada más.
// ============================================================================
import { isDesktopPointer } from '../../hooks/useDesktop';
import { trackContactLink } from '../../seo/analytics';

// Un clic retenido más viejo ya no es «el de recién»: no se abre un formulario medio minuto después. El tope no
// vale para el clic que siguió su curso: en un celular la pestaña se congela al pasar a WhatsApp y la página
// monta cuando la persona vuelve; ese toque (el de quien sí escribió) se mide igual (revisión de código, nov. 2026).
const MAX_AGE_MS = 30000;

let pending = null;

/**
 * Da la página por montada y se queda con el clic temprano. Se llama en el mismo efecto que registra los
 * listeners de clic: desde ese instante el script en línea deja de guardar clics, así que ninguno queda
 * atendido dos veces (por el listener nuevo y por la repetición).
 */
export function takeEarlyClick() {
  if (window.__jcMounted) return;
  window.__jcMounted = true;
  pending = window.__jcEarly ?? null;
  window.__jcEarly = null;
}

/** Atiende el clic temprano, una vez que todos los componentes terminaron de montar. */
export function replayEarlyClick() {
  const early = pending;
  pending = null;
  if (!early) return;
  const links = [...document.querySelectorAll('a[href^="https://wa.me/"]')];
  const textOf = (node) => (node.getAttribute('href') || '').split('text=')[1] || '';
  // La etiqueta puede cambiar al montar (con ?p= el botón del hero pasa de «Cotizar» a «Lo quiero: …», y cambian
  // el proyecto inicial y el paquete de la página de servicio) o no existir (preguntas de los artículos). Vale,
  // en este orden: el botón con la misma etiqueta; el que ocupa el mismo lugar (misma clase; si hay varios, el
  // del mismo mensaje); y recién al final cualquiera con el mismo mensaje. El lugar va antes que el mensaje
  // porque «Cotizar» del menú comparte mensaje con el hero: en una visita de anuncio el clic era para el hero.
  const samePlace = early.cls ? links.filter((node) => node.className === early.cls) : [];
  const link = (early.label && links.find((node) => node.dataset.trackLabel === early.label))
    || samePlace.find((node) => textOf(node) === early.text)
    || samePlace[0]
    || (early.text && links.find((node) => textOf(node) === early.text))
    || null;
  if (!link) return;
  if (early.held) {
    // Retenido: nada se abrió todavía. Se repite sobre el botón ya montado, que abre el formulario corto.
    const opensForm = isDesktopPointer() && !link.hasAttribute('data-wa-direct');
    if (opensForm && Date.now() - early.at <= MAX_AGE_MS) link.click();
    return;
  }
  // Siguió su curso: WhatsApp ya está abierto. Se mide como clic directo, sin tope de tiempo y sin abrir otra pestaña.
  trackContactLink(link);
}
