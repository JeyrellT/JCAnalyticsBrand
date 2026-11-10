// ============================================================================
//  src/boot.js
//  ¿La página ya venía pintada cuando llegó el JavaScript?
//
//  Cada ruta se publica como HTML estático completo. React no hidrata: vuelve a
//  crear los nodos (la línea de WhatsApp se sortea por visitante y `?p=` cambia
//  la portada, así que hidratar daría diferencias). Si los componentes arrancan
//  con sus animaciones de entrada, el titular que la persona ya estaba leyendo
//  desaparece y vuelve a entrar; en un celular de gama media eso ocurre uno o
//  dos segundos después de la primera pintura, justo cuando el dedo va hacia un
//  botón (medido en la auditoría de noviembre de 2026).
//
//  STATIC_BOOT es verdadero cuando #root ya traía contenido: la primera pantalla
//  se monta entonces en su estado final, sin animación de entrada. Durante el
//  prerender (#root vacío) vale falso y el HTML generado no cambia.
// ============================================================================
export const STATIC_BOOT = typeof document !== 'undefined' && (document.getElementById('root')?.childElementCount ?? 0) > 0;

// Mientras dura ese primer montaje, si la visita ya bajó por la página (leyó el HTML estático y siguió),
// tampoco se anima lo que tiene a la vista: Reveal y MaskLines consultan `bootScrolled()` una sola vez.
// App.jsx y JournalApp.jsx llaman a `endBoot()` cuando el primer render ya quedó en pantalla; de ahí en
// adelante todo vuelve a entrar con su animación al hacer scroll.
let booting = STATIC_BOOT;
export const endBoot = () => { booting = false; };
export const bootScrolled = () => booting && typeof window !== 'undefined' && window.scrollY > 8;
