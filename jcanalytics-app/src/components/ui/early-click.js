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
//  Un script en línea de index.html guarda ese clic en `window.__jcEarly` (con
//  lo que tenía el enlace: paquete, valor, sección, mensaje) y dice si lo
//  retuvo (`held`: computadora, clic simple). Los toques anteriores que
//  siguieron su curso quedan encadenados en `prev`. Acá, con la página montada:
//    · no retenidos (celular, enlace directo, Ctrl+clic): WhatsApp ya se abrió;
//      cada uno se mide con lo que tenía el enlace tocado, sin abrir nada más,
//      y la hoja de retorno recibe el último con la hora en que la persona
//      salió y volvió;
//    · retenido: se repite el clic sobre el mismo botón ya montado (por su
//      etiqueta, su lugar o su mensaje), que abre el formulario corto y se mide
//      como siempre. Si ese botón ya no se puede reconocer, el clic se atiende
//      con los datos del enlace estático: nunca se pierde.
// ============================================================================
import { isDesktopPointer } from '../../hooks/useDesktop';
import { trackContactIntent } from '../../seo/analytics';
import { waMessage } from '../site/links';

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

/** El botón montado que corresponde al clic temprano, o null si no se lo puede reconocer sin adivinar. */
function mountedLink(early) {
  const links = [...document.querySelectorAll('a[href^="https://wa.me/"]')];
  const textOf = (node) => (node.getAttribute('href') || '').split('text=')[1] || '';
  // El mensaje montado puede traer además la nota del anuncio («Vi el anuncio en…»), que el HTML estático no
  // conoce: se compara también con el mensaje estático ya pasado por waMessage. Sin esto, en una visita de
  // anuncio un clic en una pregunta de un artículo (enlace sin etiqueta ni clase) no encontraba su botón.
  let noted = '';
  try { noted = early.text ? encodeURIComponent(waMessage(decodeURIComponent(early.text))) : ''; } catch { /* mensaje mal formado */ }
  const sameText = (node) => Boolean(early.text) && (textOf(node) === early.text || textOf(node) === noted);
  // La etiqueta puede cambiar al montar (con ?p= el botón del hero pasa de «Cotizar» a «Lo quiero: …», y cambian
  // el proyecto inicial y el paquete de la página de servicio) o no existir (preguntas de los artículos). Vale,
  // en este orden: el botón con la misma etiqueta; el del mismo lugar (misma clase) con el mismo mensaje; el
  // único de esa clase; y cualquiera con el mismo mensaje. El lugar va antes que el mensaje porque «Cotizar» del
  // menú comparte mensaje con el hero: en una visita de anuncio el clic era para el hero. Con varios botones de
  // la misma clase y otro mensaje no se adivina (antes se tomaba el primero, que podía ser de otra sección).
  const samePlace = early.cls ? links.filter((node) => node.className === early.cls) : [];
  return (early.label && links.find((node) => node.dataset.trackLabel === early.label))
    || samePlace.find(sameText)
    || (samePlace.length === 1 ? samePlace[0] : null)
    || links.find(sameText)
    || null;
}

/** Un enlace con los datos del enlace estático tocado, para atender el clic cuando su botón ya no existe. */
function staticLink(early) {
  const link = document.createElement('a');
  link.href = early.href;
  link.target = '_blank';
  link.rel = 'noreferrer';
  link.hidden = true;
  const data = { trackLabel: early.label, trackSection: early.section, package: early.pkg, packageLabel: early.pkgLabel, value: early.value, need: early.need };
  Object.entries(data).forEach(([key, value]) => { if (value) link.dataset[key] = value; });
  return link;
}

/** Atiende el clic temprano, una vez que todos los componentes terminaron de montar. */
export function replayEarlyClick() {
  const early = pending;
  pending = null;
  if (!early) return;

  // Los toques que siguieron su curso, del más viejo al más nuevo: WhatsApp ya se abrió con el mensaje del HTML
  // estático. Cada uno se mide con lo que tenía su enlace (con ?p= el botón que queda en ese lugar al montar puede
  // ser de otro paquete, y antes se medía ese), como clic directo, sin tope de tiempo y sin abrir nada. Antes un
  // clic retenido posterior pisaba al anterior y ese nunca se medía. El último recibe la hoja «¿Pudiste enviar tu
  // mensaje?» como cualquier otro toque (ui/WhatsAppReturn.jsx); el botón montado solo le sirve para el foco.
  const taps = [];
  for (let tap = early.held ? early.prev : early; tap; tap = tap.prev) taps.unshift(tap);
  taps.forEach((tap) => trackContactIntent({ channel: 'whatsapp', section: tap.section || 'navigation', packageId: tap.pkg || undefined, packageValue: Number(tap.value) || undefined, cta: tap.label || undefined }));
  if (taps.length) {
    const last = taps.at(-1);
    window.dispatchEvent(new CustomEvent('jca:whatsapp-early', { detail: { ...last, link: mountedLink(last) } }));
  }

  // Retenido: nada se abrió todavía. Se repite sobre el botón ya montado, que abre el formulario corto.
  if (!early.held || !isDesktopPointer() || Date.now() - early.at > MAX_AGE_MS) return;
  const link = mountedLink(early);
  if (link) { if (!link.hasAttribute('data-wa-direct')) link.click(); return; }
  // Sin un botón reconocible, con los datos del enlace estático: el formulario corto lo intercepta igual.
  const fallback = staticLink(early);
  document.body.append(fallback);
  fallback.click();
  fallback.remove();
}
