// Bloqueo del desplazamiento del documento mientras hay un diálogo abierto (formulario corto, hoja del
// paquete). Lleva la cuenta: al pasar de la hoja al formulario, cerrar una no destraba el fondo de la otra.
let locks = 0;
let previous = '';

/** Bloquea el fondo y devuelve la función que lo libera (se puede llamar una sola vez). */
export function lockScroll() {
  if (typeof document === 'undefined') return () => {};
  if (locks === 0) {
    previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
  }
  locks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0) document.documentElement.style.overflow = previous;
  };
}
