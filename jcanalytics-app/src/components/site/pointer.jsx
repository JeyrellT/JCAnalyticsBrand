// ============================================================================
//  src/components/site/pointer.jsx
//  Textos e iconos que cambian según el dispositivo, sin parpadeo al cargar.
//
//  La regla de contacto es por dispositivo (hooks/useDesktop.js): en celular el
//  botón dice «Cotizar por WhatsApp» y en computadora «Pedir cotización». El
//  HTML estático se genera una sola vez, como celular, así que en computadora
//  la primera pantalla mostraba el texto de celular hasta que montaba React y
//  ahí cambiaba (y saltaba 35 px porque desaparecía la línea «¿Sin WhatsApp?»).
//
//  Durante el prerender estos componentes escriben las DOS variantes; un script
//  en línea de index.html pone `data-pointer` en <html> antes de pintar y el CSS
//  (index.css) muestra la que corresponde. Con React montado se pinta solo la
//  variante del dispositivo, igual que antes: las pruebas y el resto del código
//  no ven texto duplicado.
// ============================================================================
import { PRERENDER } from '../../boot';
import { useDesktop } from '../../hooks/useDesktop';

/** `fine`: lo que se ve en computadora (mouse). `coarse`: lo que se ve en celular y tableta. */
export function ByPointer({ fine, coarse }) {
  const desktop = useDesktop();
  if (PRERENDER) return <><span className="only-coarse">{coarse}</span><span className="only-fine">{fine}</span></>;
  return desktop ? fine : coarse;
}
