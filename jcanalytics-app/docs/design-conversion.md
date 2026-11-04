# Diseño y recorrido comercial — JC Analytics

3 de octubre de 2026.

## Dirección aplicada

Se conserva la voz del sitio: voseo costarricense, titulares editoriales y la prioridad de sistemas → finanzas y dashboards → machine learning e IA → marketing. Se aplicaron los criterios de revisión de marca y UX copy a la interfaz real, sin modificar precios ni añadir testimonios o cifras de resultados.

## Cambios de comunicación

| Antes | Cambio aplicado | Motivo |
| --- | --- | --- |
| «Hagamos algo extraordinario» en la portada | «Conversemos sobre tu proyecto» + contexto de la primera conversación | Aclara la acción y el nivel de compromiso. |
| CTA de servicios que abrían conversaciones independientes | Contacto con servicio y sección de origen seleccionados | Mantiene el contexto del visitante. |
| Exploración de posibilidades | Ejemplos conceptuales y enlaces a servicios propios | Permite conversar sobre una necesidad sin publicar identidades o resultados de clientes. |
| «Enviar por WhatsApp» | «Continuar en WhatsApp» + explicación del borrador | Describe el comportamiento real: abre un mensaje que el visitante revisa y envía. |
| Formulario con nombre y tipo de servicio | Objetivo opcional, nombre opcional y correo con el mismo borrador | Permite explicar la necesidad sin exigir datos adicionales. |
| Contacto sin detalle del recorrido | Tres pasos y dos preguntas frecuentes | Explica cómo se plantea el alcance y resuelve dudas de entrada. |

Los compromisos de 30 minutos sin costo y el tiempo de respuesta ya estaban presentes en el sitio; no son nuevas garantías creadas para esta revisión. Los ejemplos están identificados como ilustrativos. El formulario no envía mensajes automáticamente y no tiene un backend nuevo.

## Dirección de arte

- Vidrio salvia, metal cepillado, verde profundo y acento cobre.
- Arquitectura SVG con circuitos, conectores, tornillos, superficies biseladas y capas que responden a las pestañas.
- Lente SVG de IA con bisel metálico, retícula, satélites de estado y materiales con profundidad; respeta movimiento reducido.
- Imágenes v2 más detalladas y una nueva imagen de arcos para conectar el portafolio con la invitación a iniciar un proyecto.
- Variación de arte en el calendario y el cierre del reel, evitando repetir siempre la misma composición.

## Recursos finales

- [connected-materials-v2.webp](../public/artwork/connected-materials-v2.webp): 1200 × 800, 106 514 bytes.
- [creative-orbit-v2.webp](../public/artwork/creative-orbit-v2.webp): 900 × 1350, 89 236 bytes.
- [project-gateway.webp](../public/artwork/project-gateway.webp): 1200 × 800, 66 714 bytes.
- [system-architecture-v2.svg](../public/artwork/system-architecture-v2.svg).
- [neural-atlas-v2.svg](../public/artwork/neural-atlas-v2.svg).
- [campaign-orbit-v2.svg](../public/artwork/campaign-orbit-v2.svg).

Los SVG interactivos se implementan en [StudioIllustrations.jsx](../src/components/site/StudioIllustrations.jsx); las exportaciones son versiones estáticas reutilizables. Se conservaron las imágenes y los SVG anteriores.

## Ilustraciones y ejemplos

El portfolio se sustituyó por ejemplos conceptuales explícitamente ilustrativos, acompañados de arte editorial original. Los enlaces conducen a los servicios y artículos de JC Analytics. No se presentan ejemplos como casos de clientes ni como resultados medidos.

Las capturas anteriores se preservan en un archivo local ignorado fuera del directorio público. Los prompts y detalles internos de producción no forman parte de esta documentación.

## Cómo evaluar el cambio

El objetivo es facilitar consultas más claras; todavía no se ha medido un aumento de ventas o conversiones. Al publicar, conviene comparar visitas al contacto, aperturas del borrador y conversaciones efectivamente recibidas. Una apertura de WhatsApp no equivale a un mensaje enviado ni a una venta. No se incorporó seguimiento nuevo de datos personales.

## Páginas de servicio con oferta (28 de octubre de 2026)

Las páginas de servicio concentran el tráfico que no entra por la portada. Cada una muestra ahora el paquete con
su precio publicado, un checklist «¿es para vos?», una calculadora con los números de la persona, qué incluye y
qué no, cómo trabajamos (con el portal de clientes), un ejemplo real, preguntas frecuentes y un formulario corto
que deja la consulta en el portal. La barra fija de celular y la tarjeta del índice repiten la acción principal.
Todo queda medido por bloque para revisar en el portal dónde se queda la gente y qué botón convierte. Detalle en
[páginas de servicio](paginas-de-servicio.md).

## Portada corta y una página por categoría (2 de noviembre de 2026)

Cambios acordados por el equipo en la reunión del 31 de octubre de 2026 (revisión del sitio con Kata, Hilary,
Alex y Jeyrell):

| Decisión | Cambio aplicado | Dónde |
| --- | --- | --- |
| El titular no debe hablar de precio. | «Webs y sistemas con entrega a tiempo.» (la opción con más apoyo; la redacción final se define en el grupo). La invitación pasa a «primera conversación sin costo · alcance y precio por escrito». | `Hero.jsx` |
| Los precios salen de la primera pantalla. | Paquetes baja después de proyectos y proceso; el cotizador la sigue. El menú deja «Precios» al final. El aviso del paquete del anuncio (`?p=`) se conserva en la portada y sigue enlazando a `#paquetes`. | `App.jsx`, `links.js` |
| El menú abre páginas, no anclas del one-page. | Webs y sistemas, Automatización, Finanzas & BI, IA & ML y Marketing llevan a `/servicios/…`. Proyectos y Precios siguen siendo anclas de la portada. | `links.js`, `Nav.jsx`, `Footer.jsx` |
| Portada más corta, organizada por categorías. | Nueva sección «Qué hacemos» con una tarjeta por categoría (seis, con proyectos reales). Salen de la portada las demos de sistemas, finanzas e IA, la lista de nueve especialidades y la sección de redes. | `Categories.jsx`, `App.jsx` |
| Cada categoría se explica a fondo en su página. | Las demos interactivas se muestran ahora dentro de la página de su servicio, debajo de la portada y antes del índice, con la misma dirección de arte. | `ServiceDemo.jsx`, `JournalApp.jsx` |
| Marketing tiene landing propio y otro lenguaje. | Nueva página `/servicios/marketing-digital-costa-rica/` (y `/en/services/digital-marketing-costa-rica/`) para comercios y emprendimientos, con las piezas reales de la sección de redes y botón a WhatsApp. Sin oferta ni calculadora: los precios publicados son los del cotizador. | `services.js`, `catalog.js` |

Quedó para la siguiente reunión: los colores (la página se percibe oscura; se pidieron propuestas visuales
antes de tocar código) y la redacción definitiva del eslogan. No se cambió la paleta.

Lo que no se afirma: no hay cifras, testimonios ni promesas nuevas. «Entrega a tiempo» se apoya en los
compromisos ya publicados (precio fijo por escrito, avances cada 72 horas, 30 días de soporte).

## Portada más simple, revisada por tres equipos (2 de noviembre de 2026)

Tres revisiones independientes de la portada (neuromarketing, ventas y marketing), con las decisiones del 31 de
octubre como restricción, coincidieron en lo esencial. Lo aplicado:

| Hallazgo común | Cambio aplicado | Dónde |
| --- | --- | --- |
| El hero tenía ocho micro-mensajes (rótulos, firma, botones Diseño/Ingeniería/Inteligencia, tarjeta de Ideas, nota de scroll, badge) que competían con el titular. | Queda un eyebrow («Software, datos e IA · Costa Rica»), el titular, un párrafo, el selector de categoría y un botón de WhatsApp. | `Hero.jsx`, `hero.css`, `mobile.css` |
| La categoría aparecía recién en la segunda pantalla; el visitante de finanzas, IA o marketing no se veía reflejado. | Cinco chips bajo el titular abren la página de cada categoría. En celular van antes del carrusel de pantallas y el eyebrow con «Costa Rica» vuelve a mostrarse. | `Hero.jsx` |
| La cinta en movimiento decía siete cosas distintas de las cinco categorías. | Eliminada. | `App.jsx` |
| «Qué hacemos» hablaba del sitio, no del cliente. | Pregunta en segunda persona, una línea «para quién» por tarjeta y un verbo por enlace; la tarjeta de proyectos pasa a ser un enlace al pie. | `Categories.jsx` |
| El proceso se contaba cuatro veces y omitía el precio fijo y el portal. | «Cuatro compromisos, por escrito» con los textos de `WORK_PROMISES`; Paquetes y Contacto pierden sus pasos y preguntas internas. | `Process.jsx`, `Packages.jsx`, `Contact.jsx` |
| Proyectos funcionaba como catálogo (dos galerías más). | Quedan totales, explorador, una pantalla por proyecto (la prueba automática exige una captura real por proyecto en el HTML estático) y un cierre; la galería de fotos y redes vive en la página de marketing. | `Work.jsx` |
| Paquetes destacaba «Desde $60» y repetía pasos. | Seis destacados, uno por categoría; cada tarjeta enlaza a la página de su categoría; título «Precio publicado. Alcance por escrito.». | `Packages.jsx`, `packages.js` |
| Equipo sumaba cinco botones de WhatsApp más y listas de habilidades. | Retrato, nombre, rol y una línea. | `Team.jsx` |
| Ideas y Preguntas tenían títulos gemelos; Preguntas devolvía al cotizador. | «Lo que aprendimos construyendo.» y «Antes de escribirnos, lo que más preguntan.», con enlace a contacto. | `KnowledgePreview.jsx`, `FAQ.jsx` |
| Con `?p=` el precio volvía a la primera pantalla. | El aviso del anuncio nombra el paquete sin cifra; los anuncios deben aterrizar en la página de su categoría. | `Hero.jsx`, [anuncios](anuncios.md) |

No aplicado y por qué: cambiar las nueve necesidades del formulario por las cinco categorías (los valores internos
alimentan el portal y las pruebas; se revisa con el equipo), fusionar Equipo en Contacto, y esconder los botones
flotantes en celular (la acción principal del hero ahora queda por encima del pliegue, antes del carrusel).
Pendientes de la reunión: colores y redacción definitiva del eslogan.

## Pantallas reales en el hero y portada sin cotizador (3 de noviembre de 2026)

| Decisión | Cambio aplicado | Dónde |
| --- | --- | --- |
| La portada no necesita un cotizador en vivo: los precios publicados viven en Paquetes y en cada página de categoría, con su calculadora. | Sale la sección `#cotizar` con su selector de moneda y su barra inferior de celular; el menú de celular cambia el atajo «Estimar mi proyecto» por «Cómo trabajamos»; Paquetes y las páginas de finanzas y automatización dejan de remitir al cotizador. | `App.jsx`, `Nav.jsx`, `Packages.jsx`, `services.js`, estilos |
| El objeto 3D no decía nada del trabajo. En celular ya se mostraban pantallas reales. | El hero muestra la misma idea en los dos dispositivos: en computadora una laptop con la captura de escritorio (1440 px) de seis proyectos reales y en celular un teléfono con la captura móvil (390 px) de la misma pantalla. El navegador elige la captura con `<picture>`, así el HTML estático es idéntico. Rotación cada 3,6 s con pausa, «Siguiente», barra de progreso y la dirección pública del sitio cuando existe. Sale la dependencia de three.js. | `Hero.jsx`, `hero.css`, `mobile.css`, `package.json` |
| Sin la banda oscura del cotizador, Paquetes y Equipo se leían como una sola sección. | Equipo toma el tono verde claro del proceso. | `studio.css` |
| La tarjeta de marketing recortaba el titular de la pieza. | La pieza vertical se recorta hacia la foto. | `Categories.jsx`, `categories.css` |
| En pantallas de 1600 px o más la línea «con entrega a tiempo.» se cortaba: el titular crecía con el ancho de la ventana pero la columna se detiene en 1336 px. | El tamaño del titular tiene tope en 5.4rem (el de 1440 px) y la línea en cursiva puede partirse en vez de cortarse. `check:site` mide que cada línea del titular quepa a 1440, 1920 y 2560 px. | `hero.css`, `check-site.mjs` |

Pruebas: `check:site` ya no ejercita el cotizador y comprueba que `#cotizar` no exista en el HTML estático de la
portada. La asistente se sincronizó con los textos nuevos (`sync:assistant`). Los datos para las campañas están
en [campañas: datos exactos](campanas-datos.md).
