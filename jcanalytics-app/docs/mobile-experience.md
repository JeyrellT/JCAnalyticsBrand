# Experiencia móvil / octubre de 2026

La identidad y el contenido del estudio se conservan. Hasta 767 px, la página cambia de composición para facilitar la lectura y la navegación con una mano. De 768 a 1023 px se usa el mismo mapa de navegación; desde 1024 px permanece el menú de escritorio.

## Navegación

- Barra inferior con Explorar, Proyectos y Tu proyecto. El contacto conserva el contexto de la sección actual.
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
- Proyectos, equipo y ejemplos de marketing en galerías táctiles con una tarjeta siguiente visible, contador y botones alternativos. También admiten flechas del teclado al enfocar la galería.
- Servicios inicialmente cerrados en móvil; sus descripciones y precios permanecen visibles.
- El cotizador lleva al inicio del resultado y detecta su visibilidad sin exigir un porcentaje de un panel más alto que la pantalla.
- Campos de texto a 16 px para evitar el zoom involuntario al editar en iOS. Cierre del selector de moneda mediante eventos de puntero, compatibles con toque.
- La escultura deja de renderizar mientras el menú cubre la página.

## Verificación

Pruebas de navegador en Chromium/Edge con emulación táctil: 320×568, 360×740, 390×844, 430×932, 640×800, 768×1024, 844×390, 1024×768 y 1440×1000. Sin desbordamiento horizontal ni errores de página.

Se verificaron los seis destinos del menú, foco y restauración del desplazamiento, ambos lados del sistema, pestañas y teclado, vistas y meses del dashboard, el borrador contextual de contacto sin enviar mensajes, gestos táctiles de galería, botones y flechas, y la coordinación entre navegación inferior y cotizador. También se revisaron movimiento normal y reducido, vistas de escritorio y la compilación de producción.

La emulación no sustituye una revisión en un iPhone o Android físico. No se afirma una certificación de accesibilidad ni un incremento medido de conversiones.
