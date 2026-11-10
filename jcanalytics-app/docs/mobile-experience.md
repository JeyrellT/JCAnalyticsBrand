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

