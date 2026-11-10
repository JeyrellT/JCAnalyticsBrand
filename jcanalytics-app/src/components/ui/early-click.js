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
//      estable o, si cambió al montar, por su mensaje o su lugar), que ahora
//      abre el formulario corto y se mide como siempre;
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
  if (!early || Date.now() - early.at > MAX_AGE_MS) return;
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
  // Un enlace directo (data-wa-direct) ya abrió WhatsApp Web antes de montar: se mide, no se abre otra pestaña.
  if (isDesktopPointer() && !link.hasAttribute('data-wa-direct')) link.click();
  else trackContactLink(link);
}
