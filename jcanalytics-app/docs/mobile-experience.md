# Experiencia móvil / octubre de 2026

La identidad y el contenido del estudio se conservan. Hasta 767 px, la página cambia de composición para facilitar la lectura y la navegación con una mano. De 768 a 1023 px se usa el mismo mapa de navegación; desde 1024 px permanece el menú de escritorio.

## Navegación

- Barra inferior con Explorar, Ejemplos y Tu proyecto. El contacto conserva el contexto de la sección actual.
- Mapa de seis destinos en un panel inferior, con accesos adicionales al equipo y al cotizador.
- Cierre con botón, fondo o Escape; foco contenido en el diálogo, contenido exterior inerte y restauración de la posición de lectura.
- Al elegir un destino, se enfoca su título y se actualiza el fragmento de la URL.
- El teclado y la barra del cotizador tienen prioridad: los controles inferiores no se superponen entre sí.
- Se respetan las áreas seguras del teléfono, el desplazamiento táctil nativo y la preferencia de movimiento reducido. No se bloquea el zoom.

## Distribución y demos

- Portada ordenada como título, objeto, explicación e invitación.
- Sistemas ofrece dos vistas móviles: experiencia pública y operación. En escritorio se siguen mostrando juntas.
- Dashboard con métricas más legibles, resultado destacado y controles de al menos 44 px de alto.
- Etapas de IA y procesos de operación en filas legibles, en lugar de reducir el texto de diagramas horizontales.
- El equipo y los ejemplos de marketing usan galerías táctiles con una tarjeta siguiente visible, contador y botones alternativos. También admiten flechas del teclado al enfocar la galería. Los ejemplos conceptuales de servicios se eligen mediante botones identificados.
- Servicios inicialmente cerrados en móvil; sus descripciones y precios permanecen visibles.
- El cotizador lleva al inicio del resultado y detecta su visibilidad sin exigir un porcentaje de un panel más alto que la pantalla.
- Campos de texto a 16 px para evitar el zoom involuntario al editar en iOS. Cierre del selector de moneda mediante eventos de puntero, compatibles con toque.
- La escultura deja de renderizar mientras el menú cubre la página.

## Verificación

Pruebas de navegador en Chromium/Edge con emulación táctil: 320×568, 360×740, 390×844, 430×932, 640×800, 768×1024, 844×390, 1024×768 y 1440×1000. Sin desbordamiento horizontal ni errores de página.

Se verificaron los seis destinos del menú, foco y restauración del desplazamiento, ambos lados del sistema, pestañas y teclado, vistas y meses del dashboard, el borrador contextual de contacto sin enviar mensajes, gestos táctiles de galería, botones y flechas, y la coordinación entre navegación inferior y cotizador. También se revisaron movimiento normal y reducido, vistas de escritorio y la compilación de producción.

La emulación no sustituye una revisión en un iPhone o Android físico. No se afirma una certificación de accesibilidad ni un incremento medido de conversiones.

## Nota del 3 de noviembre de 2026

El cotizador en vivo y su barra inferior salieron de la portada; las referencias a la «barra del cotizador» de
este documento ya no aplican. El hero muestra pantallas reales de proyectos dentro de un teléfono (captura a
390 px) y, en computadora, dentro de una laptop (captura a 1440 px). Ver [diseño y recorrido](design-conversion.md).

## Auditoría de noviembre de 2026

- **Primera pantalla:** para quién, titular, una frase, el botón de WhatsApp y qué pasa después entran en
  390×664 y 360×740 (un celular con las barras del navegador a la vista). `check:site` lo mide.
- **Flotantes:** el de WhatsApp tiene nombre («Cotizar») y los dos se retiran mientras hay un botón principal en
  pantalla, al escribir en un formulario y con la hoja de retorno abierta.
- **Paquetes:** lista de los diez nombres y precios, cada uno desplegable (antes, un carrusel que mostraba uno).
- **Categorías:** filas compactas con miniatura; las cinco caben en pantalla y media.
- **Proyectos:** tira de miniaturas, tres pestañas en una fila y el teléfono al lado de su leyenda.
- **Menú:** el botón de contacto queda a la vista al abrirlo; el titular decorativo salió.
- Las flechas de las galerías que quedan (equipo, ejemplos de marketing) van a la izquierda: a la derecha
  quedaban debajo de los flotantes.
- Objetivos táctiles de 44 px en atajos, pestañas, idioma y pie; campos a 16 px.

### Segunda ronda (10 de noviembre de 2026)

- La primera pantalla muestra una sola frase bajo el titular, la que dice qué resuelve; la lista de servicios
  queda para computadora (en celular la repiten los atajos).
- El detalle del paquete ocupa toda la pantalla con el cierre siempre arriba y una barra abajo con el total y
  «Pedirlo por WhatsApp» (probada a 390, 360 y 320 px). El gesto «atrás» lo cierra. Antes de salir a WhatsApp
  se puede ver el mensaje exacto.
- En la lista de paquetes, la fila que se abre se recoloca si quedó tapada por la barra o demasiado abajo
  (Safari de iOS no compensa el salto cuando se cierra la fila de arriba).
- Las confirmaciones de los formularios se recolocan debajo de la barra al enviar.
- La hoja «¿Pudiste enviar tu mensaje?» pasa a una columna por debajo de 360 px, recibe el foco al aparecer y
  se cierra con Escape.
- Los flotantes también se retiran ante los enlaces secundarios que abren WhatsApp.

### Revisión de código y verificación (10 de noviembre de 2026)

- Tocar la fila de un agregado en el detalle ya no hace saltar la lista: el margen que reserva el lugar de la
  barra pegada vale solo con teclado, y las casillas del detalle no llevan el margen de 100 px de los campos.
- Cerrar el detalle deja la página donde estaba, también si se llegó por el menú «Precios» o por un enlace a un
  paquete (el navegador restauraba la posición del ancla: hasta 1.340 px de salto).
- La tira de proyectos se corre sola hasta el proyecto que llega de afuera (detalle de un paquete, «Tu caso en
  una frase», hero, anuncio). Un toque en la propia tira no la mueve.
- La insignia «El más cercano a tu caso» se parte en dos líneas si no cabe al lado del precio (320 px).
- El toque a WhatsApp hecho antes de que cargue la página también recibe la hoja «¿Pudiste enviar tu mensaje?»,
  aunque la pestaña haya quedado congelada mientras la persona estaba en WhatsApp.
- Al cerrar esa hoja el foco vuelve al botón tocado, o a la tarjeta del paquete si el botón era del detalle (que ya
  se cerró); Safari no enfoca un enlace al tocarlo y antes el foco caía al principio de la página.
