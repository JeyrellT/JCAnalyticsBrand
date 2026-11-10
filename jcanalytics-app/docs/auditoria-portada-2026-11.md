# Auditoría de la portada, las llamadas a la acción y los métodos de compra

10 de noviembre de 2026.

Revisión completa de la página principal: qué se ofrece, cómo se pide, a dónde lleva cada enlace de «lo que
hacemos» y qué pasa después de cada clic. No se limitó a un informe: lo que sigue ya está aplicado en el código,
ordenado en cinco capas. Al final van lo que no se pudo verificar, lo que se dejó como estaba a propósito y las
preguntas que solo puede responder el equipo.

## Cómo se hizo

- **Línea base.** Build de producción reproducido y recorrido con un navegador real en computadora (1440 px) y
  celular (390 px), en español e inglés: capturas de cada sección, texto visible e inventario de los 124
  controles de la portada con su destino.
- **Panel de 18 revisores independientes** sobre una copia congelada del sitio: posicionamiento, redacción,
  conversión, atención, decisión de compra, oferta y precios, ventas B2B, confianza, WhatsApp como canal, un
  comprador PYME y uno corporativo simulados, rendimiento percibido, y seis ingenierías (frontend, enlaces y
  rutas, celular, accesibilidad, SEO y rendimiento, analítica). Puntaje promedio de la portada antes de los
  cambios: **5,8 de 10** (mínimo 4,5 en «celular» y «comprador PYME»).
- **Verificación.** Cada hallazgo técnico se reprodujo por segunda vez contra el código y el sitio compilado
  antes de tocar nada: 49 de 49 confirmados (con matices de línea o de cifra, anotados).
- **Segunda ronda.** Con los cambios aplicados, ocho revisores volvieron a recorrer el sitio compilado: promedio
  **7,5 de 10**. Encontraron siete regresiones y unos cuarenta pendientes; lo que se hizo con cada uno está en
  «Segunda ronda», más abajo.
- **Restricciones respetadas.** Titular acordado, paleta, voseo, regla de contacto por dispositivo (celular →
  WhatsApp; computadora → formulario corto), ningún precio en la primera pantalla, ningún dato inventado
  (testimonios, plazos de pago, horarios), precios solo desde `portal/shared/service-pricing.js` y las claves
  que recibe el portal sin cambios.

## Capa 1 · Enrutamiento y verdad

Lo que llevaba al lugar equivocado o decía algo que no era cierto.

| Hallazgo | Cambio aplicado | Dónde |
| --- | --- | --- |
| Seis de las diez tarjetas de paquete llevaban a una página que desarrollaba **otro** paquete (Software, Power BI y Excel caían en el primero de su categoría; CRM e Inventario en «Web con reservas»; Chatbot en una página que no lo nombraba). Quien tocaba «Lo quiero» ahí pedía el paquete equivocado. | Cada tarjeta enlaza a `…/?p=<paquete>#oferta` y la página de la categoría muestra **ese** paquete (precio, «Qué incluye», calculadora, barra y mensaje). Los demás paquetes de la categoría quedan a un clic («Ver este paquete») y cambian la oferta sin recargar. Chatbot pasa a IA; CRM e Inventario se ofrecen en Webs y sistemas. | `ServiceSales.jsx`, `data/packages.js`, `content/service-offers.js` |
| El JSON-LD declaraba cinco servicios en anclas que la portada ya no tiene (`#plataformas`, `#finanzas`…). | Cada servicio apunta a su página. Se agrega la localidad que ya publica el pie. | `seo/site.js` |
| «Agendar los 30 minutos» no agendaba: bajaba a un formulario marcado «Sistema / backend». | «Pedir mis 30 minutos sin costo», con el mensaje ya escrito (WhatsApp en celular, formulario corto en computadora). | `Process.jsx` |
| «Así se ve el portal de clientes» abría una pantalla de ingreso. «Portal» era el del equipo en el encabezado y el de clientes en el pie. | El acceso queda para quien ya es cliente («¿Ya sos cliente? Entrar a tu portal»), junto al compromiso que lo nombra. El ingreso del equipo sale del encabezado y vive en el pie. | `Process.jsx`, `Nav.jsx`, `Footer.jsx` |
| Con `?p=` (visita de un anuncio) el botón decía «¿No sabés cuál?» pero enviaba el pedido de un paquete con precio. | El hero nombra el paquete del anuncio y el botón dice «Lo quiero: {paquete}»; el enlace alterno ofrece cotizar otro caso. | `Hero.jsx` |
| `utm_content={{ad.name}}` activaba un paquete cuando el nombre del anuncio se parecía a un alias («IA-2», «Web 1», «Ventas»). | Solo cuenta si es exactamente la clave o un alias. `p` y `paquete` siguen aceptando alias. | `data/packages.js` |
| Toda consulta salía como «Sistema / backend» aunque nadie lo hubiera elegido, y en computadora se perdía desde qué botón llegaba. | Nada viene marcado; sin elección llega como «Otro». El origen del clic viaja dentro del mensaje que recibe el portal. | `Contact.jsx`, `links.js`, `ContactCTA.jsx` |
| `?proyecto=` elegía el proyecto pero aterrizaba 700 px arriba de donde se veía; el evento para mostrar un proyecto no lo emitía nadie. | El explorador tiene su ancla (`#proyecto`); el hero, «tu caso en una frase» y la hoja de un paquete abren el proyecto y la pantalla exactos. | `Work.jsx`, `Hero.jsx`, `CaseMatcher.jsx`, `PackageSheet.jsx` |
| La página de marketing no tenía precio ni botón arriba (el primero estaba a casi cinco pantallas en celular) y «Hablemos» sacaba a la visita hacia la portada. | Bloque propio bajo el titular con el precio «desde» que ya publicaba la misma página y el botón «Armemos mi plan de marketing». «Hablemos» apunta ahí. | `JournalApp.jsx` |
| Cada categoría tenía de cuatro a seis nombres (menú, hero, tarjetas, pie, formulario) y el pie listaba los servicios dos veces. | Una sola fuente de nombres y orden. | `content/categories.js`, `links.js`, `Footer.jsx` |
| «Elegís uno… y arrancamos» y «lo que ves es lo que cuesta» no eran ciertos (hay conversación y alcance por escrito antes; IVA, dominio, licencias y consumos van aparte). | «Así se compra» en tres pasos reales y, en cada tarjeta, lo que hay que tener en cuenta. | `Packages.jsx` |
| La categoría de dashboards se ilustraba con una pantalla en ₡0. | Se usa la única captura de panel con datos de demostración. | `content/services.js`, `Hero.jsx` |
| El WhatsApp del pie abría un chat vacío. | Abre con un mensaje. | `Footer.jsx` |

## Capa 2 · Claridad y jerarquía

| Hallazgo | Cambio aplicado | Dónde |
| --- | --- | --- |
| En celular el botón verde quedaba debajo del pliegue en todos los tamaños reales (390×664, 360×740…): 192 px de la primera pantalla eran espacios heredados del escritorio. | Primera pantalla: para quién, titular, una frase, el botón y qué pasa después. `check:site` mide que el botón y sus tres garantías entren en 390×664 y 360×740. Los atajos por categoría van después, a 46 px de alto. | `Hero.jsx`, `mobile.css`, `hero.css` |
| El botón principal se presentaba como la salida del indeciso («¿No sabés cuál?») y nada decía qué pasaba al tocarlo. | Un solo verbo en todo el sitio para cotizar («Pedir cotización» / «Cotizar por WhatsApp») y tres garantías debajo: respuesta en menos de 24 h, 30 minutos sin costo, alcance y precio fijo por escrito. | `Hero.jsx`, `Nav.jsx`, `messages.js` |
| Las secciones se llamaban como el sitio se organiza, no como la persona pregunta, y el contacto llegaba después del blog. | Cada sección responde una pregunta, en este orden: ¿cuál es mi caso? → ¿ya lo hicieron? → ¿qué arriesgo? → ¿cuánto cuesta? → ¿qué más debería saber? → ¿quién me va a atender? → ¿cómo empiezo? El cuaderno de ideas va al final. | `App.jsx` y cada sección |
| «Qué hacemos» repetía los atajos del hero en 3,7 pantallas de celular y no ayudaba a quien no sabe su categoría. | Tarjetas compactas en celular (las cinco en pantalla y media) y **«Tu caso en una frase»**: dos listas («Tengo… y quiero…») que devuelven la categoría, el paquete publicado más cercano y un proyecto real de ese giro. | `Categories.jsx`, `CaseMatcher.jsx` |
| Proyectos hablaba a programadores (líneas de código, commits, endpoints) y tenía dos selectores: una lista y, más abajo, una galería de diez capturas que sumaba casi tres pantallas. | Cada proyecto cuenta **el problema** del negocio y **lo que se construyó** (los textos ya existían y no se mostraban). Un solo selector con miniaturas. Las cifras de la sección hablan de proyectos, sitios que se pueden abrir y giros; lo técnico queda en la pestaña «Cómo está hecho». Arranca en un proyecto con sitio público y el enlace dice el dominio. | `Work.jsx`, `projects.css`, `data/projects.js` |
| El menú mezclaba al comprador con el equipo (Portal, Ideas) y usaba abreviaturas («Finanzas & BI», «IA & ML»). | Barra de quien viene a comprar: categorías, proyectos, precios, idioma y una acción. En el menú de celular el botón de contacto queda a la vista al abrir (antes, 150 px fuera de la hoja). | `Nav.jsx`, `mobile.css` |

## Capa 3 · Compra

| Hallazgo | Cambio aplicado | Dónde |
| --- | --- | --- |
| Frente a «Lo quiero» no se sabía qué quedaba fuera del precio, qué agregados existían ni qué pasaba después; no había nada que reenviar a quien aprueba el gasto. | **Hoja del paquete**: qué incluye, qué tener en cuenta, qué hace falta para empezar, la opción con IA y los agregados con precio publicado como casillas que suman a un total a la vista, los tres pasos siguientes, imprimir o guardar en PDF y un enlace para compartir (`#hoja-<paquete>`). El pedido sale con lo marcado. | `PackageSheet.jsx`, `package-sheet.css` |
| En celular se veía un paquete de diez (el de $570) y el de $60 estaba a siete deslizamientos; las flechas del carrusel quedaban debajo del botón flotante y el toque abría WhatsApp. | Lista de los diez nombres y precios de un vistazo; cada uno se despliega. Los diez están siempre en el HTML (antes cuatro solo existían con JavaScript). | `Packages.jsx`, `packages.css` |
| El formulario corto de computadora explicaba por qué no se abrió WhatsApp Web en vez de decir qué se pide y qué se recibe; al enviar, el foco se perdía y nada confirmaba. Un segundo envío rápido se descartaba en el portal sin avisar. | Encabezado por contexto («TU PEDIDO» / «COTIZACIÓN»), mensaje plegado en los pedidos, error junto al campo, confirmación con los pasos que siguen, reloj contra bots que arranca en la primera apertura, fondo fijo y cierre que no se dispara al arrastrar una selección. | `LeadDialog.jsx`, `scroll-lock.js` |
| El formulario de contacto pedía cuatro pasos numerados, sin etiquetas visibles en WhatsApp y correo, y avisaba los errores en 12 px debajo de un botón secundario. | Siete opciones con palabras de negocio (mismas claves del portal), etiquetas visibles, error junto al campo con foco, confirmación a la vista. En celular solo se pide lo del mensaje; WhatsApp y correo aparecen con «Prefiero que me contacten». | `Contact.jsx`, `conversion.css` |
| Había doce plantillas de mensaje con tres saludos distintos; el botón flotante escribía «estoy viendo El estudio y quiero cotizar». | Catálogo único de mensajes; el flotante de celular dice «Cotizar» y cambia su mensaje según la sección. | `messages.js`, `Nav.jsx` |
| Los dos círculos flotantes tapaban atajos del hero y enlaces de paquetes (un toque en «Marketing» abría el asistente). | Se retiran mientras hay un botón principal en pantalla o se escribe en un formulario. | `Nav.jsx`, `mobile.css` |
| En celular, quien toca WhatsApp y no envía el mensaje se pierde sin dejar rastro. | **Red de seguridad**: al volver a la página, una hoja pregunta (una vez por visita) si pudo enviar el mensaje; si no, deja su número y la consulta llega al portal con el mismo mensaje y paquete. No vuelve a contar como conversión. | `WhatsAppReturn.jsx` |

## Capa 4 · Confianza y persuasión

| Hallazgo | Cambio aplicado | Dónde |
| --- | --- | --- |
| El titular promete entrega a tiempo y ninguna sección decía cómo. | Cada compromiso va bajo la duda que responde («¿Cuánto voy a pagar?», «¿Cómo sé que avanza?»…) y el encabezado explica el mecanismo con hechos ya publicados: plazo de cada paquete, alcance por escrito y avances cada 72 horas. | `Process.jsx` |
| Las preguntas frecuentes no respondían plazo ni riesgo. | Seis respuestas (el número no cambia): qué hacemos, cuánto cuesta, **cuánto tarda**, **qué pasa si algo no queda bien**, remoto e inglés, y qué pasa después de escribir. Las cifras salen del tarifario. El asistente quedó sincronizado. | `seo/site.js`, `FAQ.jsx`, `assistant-api/knowledge.json` |
| «No un bot» convivía con un asistente de IA en la esquina. | El contacto dice quién lee el formulario y el WhatsApp, y que el asistente sí es IA. El botón del asistente lo indica («· IA»). Se muestra el número de WhatsApp. | `Contact.jsx`, `AssistantChat.jsx` |
| Roles en inglés y una flecha decorativa sobre cada retrato que parecía un enlace. | Roles en español en la versión en español; sin flecha. | `data/team.js`, `Team.jsx` |
| El pie no recordaba nada de lo que reduce el riesgo. | Su primera línea repite los cuatro compromisos; la flecha ↗ queda solo en lo que abre otra pestaña. | `Footer.jsx` |

## Capa 5 · Pulido técnico y medición

| Hallazgo | Cambio aplicado | Dónde |
| --- | --- | --- |
| Al llegar el JavaScript, la primera pantalla ya pintada se borraba y volvía a entrar animada (alrededor de 1 s sin titular ni botón, justo cuando el dedo va hacia un chip). | El primer montaje sobre HTML ya pintado arranca en su estado final; si la visita ya había bajado, tampoco se anima lo que tiene a la vista. | `boot.js`, `primitives.jsx`, `Nav.jsx` |
| GSAP completo (32 KB gzip) se descargaba para todos y solo hacía de reloj del scroll suave; Lenis bajaba también en celular. | GSAP sale del proyecto; Lenis se carga en diferido y solo en computadora. | `App.jsx`, `package.json`, `vite.config.js` |
| El carrusel del hero montaba tres pantallas desde el inicio y nunca se detenía; las miniaturas pedían imágenes de 1600 px. | Una pantalla al cargar (las vecinas se montan cuando van a hacer falta), una vuelta y se detiene, pausa con el puntero o el foco encima, y `sizes` reales en las miniaturas. | `Hero.jsx`, `Categories.jsx` |
| Los titulares se leían pegados en el HTML sin estilos («sistemascon», «Hecho,no»). | Espacio entre renglones. | `primitives.jsx` |
| Pestañas sin panel ni flechas, miniaturas llamadas «01», errores que no decían qué campo, 85 de 386 textos por debajo de 4,5:1 y controles de 32 a 40 px. | Patrón de pestañas completo, nombres por lo que muestran, errores con campo y foco, mismos verdes más oscuros en el texto secundario y 44 px en lo que se toca. | `Work.jsx`, `Contact.jsx`, `LeadDialog.jsx`, `conversion.css` |
| Las etiquetas de clic salían del texto visible (cambiaban con idioma, dispositivo y cada ajuste de redacción); 36 controles caían sin sección. | Etiqueta estable en cada botón (`Zona · Acción · id`) y sección declarada para menú, flotante, pie y formulario corto. Google recibe `cta_id`. | componentes, `analytics.js` |
| Una misma persona contaba dos conversiones: enviaba el formulario y después abría WhatsApp Web. | Después de una consulta aceptada, el clic a WhatsApp se registra como intención (`after_lead`) y no suma otra conversión. | `analytics.js` |
| El píxel de Meta estaba en configuración automática: puede leer el texto y el destino de los botones, y los enlaces de contacto llevan el nombre y el mensaje de la persona. | `autoConfig` apagado: solo salen los cuatro eventos que el sitio envía a mano. | `index.html` |
| «Formulario empezado» contaba cada apertura del formulario corto; las preguntas frecuentes no se medían; un clic en el primer segundo no quedaba registrado; un envío con el portal caído quedaba en «Enviando…». | Empezado = la persona escribió algo; se mide qué pregunta se abre; la medición arranca con el primer toque; el envío corta a los 12 s y muestra la alternativa. | `site-tracker.js`, `main.jsx`, `FAQ.jsx` |

`check:site` suma candados para que nada de esto se pierda: cada tarjeta de paquete aterriza en su propia oferta
con el mismo precio; el botón del hero y sus garantías entran en 390×664 y 360×740; los flotantes no tapan los
atajos; `utm_content=IA-2` no activa un paquete; cada enlace a WhatsApp tiene etiqueta propia; el JSON-LD de la
portada apunta a las cinco páginas; el formulario llega sin nada marcado, avisa junto al campo y confirma con
los pasos; y una consulta aceptada no vuelve a convertir por WhatsApp.

## Segunda ronda · el panel revisa la versión nueva

Con las cinco capas aplicadas, ocho revisores volvieron a recorrer el sitio compilado (copia congelada, solo
lectura, cada uno con su navegador): cuatro de negocio y cuatro de ingeniería. La consigna fue distinta: qué
quedó bien, qué se rompió y qué falta.

| Lente | Puntaje |
|---|---|
| Conversión y economía conductual | 7,5 |
| Redacción de respuesta directa y atención | 7,8 |
| Ventas B2B · comprador corporativo simulado (computadora) | 7,5 |
| Clienta PYME simulada (celular, con y sin anuncio) | 7,5 |
| Oferta, precios y venta conversacional | 7,5 |
| QA de enlaces, rutas y flujos | 7,0 |
| Experiencia móvil y accesibilidad (WCAG 2.1 AA) | 7,8 |
| Analítica, rendimiento y SEO técnico | 7,5 |
| **Promedio** | **7,5** (la primera ronda: 5,8) |

Lo que confirmaron y no hay que volver a tocar: cero enlaces rotos en 12 páginas, dos idiomas y dos
dispositivos; las diez tarjetas, los diez detalles y las diez variantes `?p=` coinciden con el tarifario en
precio, plazo, alcance, exclusiones y agregados; contraste sin fallos (antes 85 textos de 386); ningún objetivo
táctil menor de 44 px; ningún dato personal hacia las plataformas de anuncios; `after_lead` evita la doble
conversión; sin parpadeo de opacidad al montar.

### Regresiones que encontraron (todas corregidas)

| Qué se rompió con la primera ronda | Corrección | Dónde |
|---|---|---|
| La confirmación del formulario de contacto quedaba fuera de pantalla: el formulario largo se reemplaza por un bloque corto y la página se acorta bajo la persona | Al enviar, la confirmación se recoloca debajo de la barra y recibe el foco (portada y páginas de servicio) | `Contact.jsx`, `ServiceSales.jsx`, `scroll.js` |
| El enlace al paquete de «Tu caso en una frase» caía 370 px pasado en celular y debajo de la barra en computadora | La tarjeta se recoloca con el diseño ya final y respetando su `scroll-margin-top`; en computadora el desplazamiento suave ya no ignora la barra en destinos que no son secciones (`#paquete-…`, `#proyecto`) | `Packages.jsx`, `App.jsx`, `scroll.js` |
| Lista de paquetes de celular: al abrir una fila, su nombre y precio quedaban fuera de pantalla (se cierra la de arriba) | La fila recién abierta se recoloca si quedó tapada o demasiado abajo | `Packages.jsx` |
| En celular la bajada del hero era solo el inventario de servicios | La única frase de celular dice qué resuelve, con palabras de quien compra; la lista queda para computadora | `Hero.jsx` |
| El mensaje de WhatsApp del formulario de contacto no seguía el catálogo (otro saludo, frase de relleno) | Mismo patrón que `messages.js`; sin texto, invita a contar el caso | `Contact.jsx` |
| En computadora el botón del hero cambiaba de «Cotizar por WhatsApp» a «Pedir cotización» al montar React y la pantalla saltaba 35 px | El HTML estático trae las dos variantes y un script en línea decide cuál se ve antes de pintar (`data-pointer`) | `index.html`, `pointer.jsx`, `boot.js`, `index.css` |
| El punto final de la frase quedaba solo en una línea en celular | Se oculta cuando las listas ocupan todo el ancho | `CaseMatcher.jsx`, `categories.css` |

### Lo que faltaba (aplicado)

**Compra**

| Hallazgo | Cambio | Dónde |
|---|---|---|
| En el detalle del paquete el total y el botón quedaban a dos pantallas en celular y cortados en un portátil | Barra pegada al borde inferior con el total en vivo y el único botón verde; en pantallas angostas las casillas van justo después de «Incluido»; el cierre acompaña el desplazamiento | `PackageSheet.jsx`, `package-sheet.css` |
| «Atrás» con el detalle abierto sacaba a la persona del sitio | El detalle tiene su entrada en el historial: «atrás» lo cierra | `Packages.jsx` |
| «Compartir con quien aprueba» y el botón Atrás perdían lo marcado | La selección viaja en el enlace: `#hoja-<clave>.ia.<agregado>`; se copia texto + enlace | `data/packages.js`, `PackageSheet.jsx` |
| «Imprimir o guardar en PDF» generaba 19 páginas (18 en blanco) | Se imprime una copia del detalle, sola en el documento: una página, con los cuatro compromisos publicados | `PackageSheet.jsx`, `package-sheet.css` |
| El pedido llegaba sin una palabra del caso: la primera respuesta del equipo era siempre otra pregunta | El mensaje cierra con «¿Me confirman si calza con mi caso?» y la línea abierta «Mi negocio:»; el formulario corto tiene un campo opcional de una línea, «¿Para qué negocio es?» | `data/packages.js`, `LeadDialog.jsx` |
| El formulario mostraba otro monto sin decir por qué, y al cerrarlo se perdía lo marcado | «Incluye lo que marcaste: …»; en computadora el detalle queda abierto debajo del formulario | `LeadDialog.jsx`, `PackageSheet.jsx` |
| Después de enviar, la persona no se quedaba con nada | La confirmación repite lo pedido con su total, dice qué ir juntando («Para empezar necesitamos») y deja volver al detalle para guardarlo | `LeadDialog.jsx` |
| Los miles se escribían de tres maneras («$1 565», «₡806 000», «1.000 contactos») | Una sola función: punto en español, coma en inglés | `data/packages.js` |
| Dashboard inicial no avisaba cuándo corresponde Power BI de gestión | Aviso con datos del tarifario y enlace al otro detalle | `data/packages.js`, `PackageSheet.jsx` |
| El proyecto relacionado de los dashboards era un sistema de transporte, sin aclararlo | El enlace dice qué se ve de verdad («no es Power BI»); si la persona eligió su giro, se ofrece el proyecto de ese giro | `data/packages.js`, `PackageSheet.jsx` |
| En celular no se sabía qué texto se iba a enviar | «Ver el mensaje que se abre en WhatsApp», dentro del detalle | `PackageSheet.jsx` |

**«Tu caso en una frase»**

| Hallazgo | Cambio | Dónde |
|---|---|---|
| La respuesta mandaba a navegar en vez de a cotizar y no mostraba el precio | Precio, colones y plazo en la respuesta; cotizar es el botón verde; «Ver qué incluye…» abre el detalle sin salir de la portada | `CaseMatcher.jsx`, `categories.css` |
| Un restaurante veía un sistema de pedidos con pagos junto a un paquete de reservas que no los incluye | El proyecto se presenta como «más amplio que ese paquete: si querés algo así, te lo cotizamos por escrito» | `CaseMatcher.jsx` |
| La frase se perdía al pedir un paquete o tocar «Cotizar» | La elección dura toda la visita: los pedidos y «Cotizar» salen con la frase, la tarjeta del paquete lleva «El más cercano a tu caso» y el explorador abre en el proyecto de ese giro. Solo vive en el navegador; a los anuncios no les llega | `case.js` (nuevo), `Hero.jsx`, `Nav.jsx`, `Packages.jsx`, `Work.jsx` |

**Claridad**

| Hallazgo | Cambio | Dónde |
|---|---|---|
| «Menos de 24 h» cuatro veces en la pantalla de contacto; el único dato necesario se pedía al final | Se dice una vez por modo; WhatsApp o correo van primero | `Contact.jsx` |
| Dos líneas largas e idénticas bajo cada «Lo quiero»; «hoja del paquete» es jerga interna | Nota corta, enlace de texto («Ver todo lo que incluye y los agregados») y «Detalle del paquete» | `Packages.jsx`, `packages.css` |
| Los paquetes de $60 y $180 no se veían en computadora | La introducción dice el rango y el botón, cuántos faltan y desde qué precio (calculado) | `Packages.jsx` |
| Las dos primeras preguntas frecuentes hablaban en voz de estudio | Reescritas con los mismos hechos y variables | `seo/site.js` |
| La burbuja de chat prometía WhatsApp donde el clic abre un formulario | En computadora, el icono de enviar | `ContactIcon.jsx` (nuevo) |
| «Lo que construimos» de La Burrada estaba escrito para programadores; abrir el sitio real quedaba al final | Texto en términos de quien pide y quien cocina; la dirección de la barra del navegador es un enlace | `data/projects.js`, `Work.jsx` |
| «Dominio y alojamiento aparte» sin explicar | Nota al pie con qué es cada uno | `Packages.jsx` |

**Páginas de servicio**

| Hallazgo | Cambio | Dónde |
|---|---|---|
| El mensaje citaba el titular de la página; la confirmación era una línea; el error no decía qué corregir | Mismo mensaje que la portada, confirmación con los tres pasos y aviso por campo con foco | `ServiceSales.jsx` |
| El mismo paquete viajaba con otra clave, otra necesidad y sin leer `utm_content` | `data-package` es la clave del tarifario en todo el sitio, la necesidad es la del paquete y `utm_content` activa el paquete igual que en la portada | `ServiceSales.jsx`, `LeadDialog.jsx` |

**Medición y técnica**

| Hallazgo | Cambio | Dónde |
|---|---|---|
| El clic hecho antes de que monte React no se medía y en computadora se iba a WhatsApp Web | Se guarda, se detiene en computadora y se repite al montar (abre el formulario); en celular se mide | `index.html`, `early-click.js` (nuevo) |
| El selector y las casillas no dejaban rastro | Llegan al portal como clics con la clave elegida («Caso · meta · numeros», «Hoja · pagina_web · Agregado whatsapp · sí»); también que la hoja de retorno se mostró | `site-tracker.js`, `WhatsAppReturn.jsx` |
| Conteos dobles: ChatGPT recibía dos consultas por la hoja de retorno; «Volver a WhatsApp» convertía otra vez | Una conversión de WhatsApp por visita; los clics siguientes llevan `repeat: true` | `analytics.js` |
| Las etiquetas de los botones llevaban el nombre traducido del paquete | Llevan la clave (`Paquetes · Lo quiero · pagina_web`) | `Packages.jsx`, `PackageSheet.jsx`, `Hero.jsx` |
| Cambio de idioma: un ancla vieja le ganaba a la sección que se estaba leyendo | Manda lo que hay en pantalla; `#hoja-…` y `#paquete-…` se conservan | `LanguageSwitcher.jsx` |
| Hoja de retorno: 89 px de campo a 320 px, invisible para lector de pantalla | Una columna a 320 px, foco al título, Escape la cierra | `WhatsAppReturn.jsx`, `whatsapp-return.css` |
| Los flotantes tapaban un tercio de los enlaces secundarios de WhatsApp | También se retiran ante ellos | `Nav.jsx` |
| Los precios y las preguntas no estaban en los datos estructurados | Cada servicio declara sus paquetes como ofertas (10) y la portada sus seis preguntas | `seo/site.js` |

### Revisión de código de lo cambiado en la segunda ronda

Antes de publicar, cuatro revisores leyeron el diff de la segunda ronda, cada uno con una lente (flujo y
estado, CSS y accesibilidad, medición y datos, textos y verdad), con la consigna de encontrar lo que se rompe
y decir cómo reproducirlo. Encontraron 29 puntos (10 de severidad media, 19 baja); cada uno se comprobó contra
el código antes de tocarlo y todos quedaron corregidos. Ninguno era visible en el recorrido normal: salen con
anuncios, con «atrás», con teclado o cuando todo está marcado a la vez.

| Hallazgo | Cambio | Dónde |
|---|---|---|
| Cerrar el detalle saltaba a la tarjeta del `#paquete-…` anterior (dos avisos del historial, se frenaba uno) | El cierre no mueve la página ni cambia la fila abierta | `Packages.jsx` |
| Con «otro tipo de negocio», o solo la meta, el pedido perdía «Mi negocio:» y el formulario, su campo | La frase reemplaza esa línea solo cuando dice el giro (`packSentence`) | `case.js`, `Packages.jsx`, `PackageSheet.jsx` |
| Los formularios que escriben directo al portal no llevaban la frase del caso | La llevan, con su necesidad | `Contact.jsx`, `ServiceSales.jsx` |
| El clic temprano se perdía si la etiqueta del botón cambiaba al montar (`?p=`) | Se busca por etiqueta, después por lugar y al final por mensaje | `early-click.js` |
| Los enlaces de la confirmación recargaban la portada en visitas de anuncio | Conservan la consulta de la dirección: son saltos de ancla | `LeadDialog.jsx` |
| «Ver el mensaje» no mostraba la línea del anuncio; «…, con Con IA»; nombre traducido en la hoja de retorno | Se muestra lo que de verdad sale; «Incluye: Con IA»; nombre del tarifario | `PackageSheet.jsx`, `LeadDialog.jsx`, `WhatsAppReturn.jsx` |
| Pasar al paquete mayor dejaba el título y el foco fuera de pantalla | Empieza arriba, con el foco en el título | `PackageSheet.jsx` |
| La barra pegada tapaba el control enfocado | El detalle reserva el lugar de la barra y del cierre mientras el foco se ve (teclado); con mouse o al tocar, no (ver la verificación, abajo) | `package-sheet.css` |
| Foco perdido al ir al proyecto y al cerrar la hoja de retorno; ejemplos de campo a 3,09:1; anillo en títulos enfocados por programa; expansor inútil sin JavaScript | Foco al proyecto elegido y de vuelta al botón de origen; contraste 5,08:1; sin anillo; expansor oculto | `PackageSheet.jsx`, `WhatsAppReturn.jsx`, `lead-dialog.css`, `packages.css` |
| «Sus indicadores de operación son reales» contradecía «captura con datos de demostración» | La nota dice que es el panel de un sistema real con datos de demostración, y que no es Power BI | `data/packages.js` |
| El aviso del paquete mayor ofrecía «que cada persona vea lo suyo», que es un agregado de +$90 | Pregunta por dos fuentes o más de un perfil de acceso, que sí incluye | `data/packages.js` |
| «Es un sistema más amplio que ese paquete» era falso para la distribuidora (su proyecto es un sitio web) | Ese giro dice qué es su proyecto y que no equivale al paquete | `case.js`, `CaseMatcher.jsx`, `PackageSheet.jsx` |
| La insignia «El de tu caso» afirmaba un calce sin confirmar | «El más cercano a tu caso» | `Packages.jsx` |
| «Copiado» seguía a la vista después de cambiar lo marcado; «andá juntando:» no armaba con cuatro paquetes; La Burrada decía «sin que nadie revise comprobantes» | El aviso se borra al cambiar; frase completa; la historia dice revisión humana en caso de duda e inventario por receta | `PackageSheet.jsx`, `LeadDialog.jsx`, `data/projects.js` |
| Página de servicio con anuncio y todo marcado: el pedido pasaba de 600 y llegaba cortado («Mi neg») | Se mide lo que sale (con la nota del anuncio) y se deja lugar para el negocio; si no entra, las situaciones van por número («Me pasan las situaciones 1, 2 y 4 de las 5»), sin perder cuáles | `ServiceSales.jsx` |
| La conversión «por visita» duraba lo que la pestaña: quien volvía por otro anuncio ya no contaba | Otro clic de anuncio (`gclid`, `gbraid`, `wbraid`, `fbclid`) empieza otra visita | `analytics.js` |
| Las casillas y señales medidas no decían de qué paquete o página eran (`whatsapp` es +$270 en CRM y +$180 en Web) | Etiquetas con la clave del paquete o de la página; ninguna pasa de 60 caracteres | `PackageSheet.jsx`, `ServiceSales.jsx` |
| Clic temprano: el de celular se descartaba pasados 30 s y un Ctrl+clic terminaba abriendo el formulario | El script anota si retuvo el clic; el que siguió su curso se mide siempre y no abre nada | `index.html`, `early-click.js`, `LeadDialog.jsx` |
| Datos estructurados: «días hábiles» como día calendario, unidad en inglés y precio sin decir que es sin IVA | Unidad en el idioma de la página, sin código `DAY`, y `valueAddedTaxIncluded: false` desde el tarifario | `seo/site.js` |
| Los candados no cubrían las reglas de medición nuevas | Candados para una conversión por visita, anuncio nuevo, hoja de retorno, clic temprano (retenido, Ctrl+clic, celular), etiquetas, ofertas y preguntas declaradas, pedido de 600 caracteres y confirmación a la vista con el desplazamiento suave; cuatro se verificaron rompiendo la regla a propósito | `scripts/check-site.mjs` |

**Verificación de las correcciones.** Cada lente tenía un verificador que reproduce cada hallazgo sobre el sitio
compilado, deshaciendo al vuelo solo la corrección correspondiente, para confirmar que el defecto existía y que
la corrección lo quita. El de CSS y accesibilidad terminó: confirmó los siete y encontró dos restos, ya
corregidos (los otros tres se cortaron por el límite de uso de la sesión y se volvieron a correr sobre la versión
final; ver «Tercera verificación»):

- **El margen fijo de la barra hacía saltar la lista.** Tocar la fila de una casilla también la enfoca, y con el
  margen reservado todo el tiempo (más el de 100 px que celular da a los campos) la lista se movía bajo el dedo:
  hasta 365 px en un celular y 200 px con el mouse. Ahora el margen vale solo con foco de teclado
  (`:has(:focus-visible)`) y las casillas no llevan el de celular.
- **En celular el proyecto elegido podía quedar fuera de la tira.** Por debajo de 1024 px los proyectos son una
  tira horizontal: «Ver un proyecto real» del CRM (CAVIQ, el octavo) lo marcaba y enfocaba fuera de la vista.
  Ahora la tira se corre sola hasta el proyecto que llega de afuera (detalle, «Tu caso en una frase», hero,
  anuncio), sin mover la página.
- Refuerzo: Safari no enfoca un enlace al tocarlo; al cerrar la hoja «¿Pudiste enviar tu mensaje?» el foco
  vuelve igual al botón tocado.

Los tres tienen candado en `checkSecondRound` y se comprobaron rompiendo la regla a propósito.

**Tercera verificación, sobre la versión corregida.** Los cuatro verificadores volvieron a correr completos, con
navegador, sobre el build congelado de la versión corregida: reprodujeron los 29 hallazgos y buscaron efectos
secundarios de las correcciones. 22 quedaron corregidos sin resto; 7 dejaron un resto o un efecto secundario, y
aparecieron 9 casos nuevos en la zona de las correcciones (dos de severidad media). Sin repetir son doce
arreglos, todos aplicados:

- **Medición.** Un anuncio nuevo en la misma pestaña reinicia también la sesión y la fuente del portal: antes la
  consulta de esa visita llegaba con la campaña de la anterior. En celular, el pedido de la página de servicio ya
  no reserva lugar para un campo que solo existe en computadora (cambiaba por números pedidos que entraban
  enteros). El formulario de esa página recorta solo lo escrito por la persona: antes se llevaba la frase del caso
  o dejaba un monto a medias («≈ US$1.»). El toque hecho antes de que cargue la página se mide con el paquete
  del mensaje que de verdad se abrió y recibe la hoja «¿Pudiste enviar tu mensaje?» (antes nunca).
- **Flujo.** Cerrar el detalle después de llegar por un ancla (menú «Precios», `#paquete-…`) ya no hace saltar la
  página: el navegador restauraba la posición vieja del ancla, hasta 1.340 px. El clic temprano en una pregunta
  de un artículo con anuncio ya no se pierde, y un toque anterior que ya siguió a WhatsApp no queda pisado.
- **Textos.** La insignia «El más cercano a tu caso» baja debajo del nombre cuando no cabe (se salía de la
  tarjeta a 768 px y pisaba el precio a 320 px). Con el giro «transporte», el detalle de los dashboards conserva
  su nota («No es Power BI», «datos de demostración»).
- **Accesibilidad.** El margen de la barra pegada también vale al leer con Espacio después de un clic en el texto
  (el foco queda en el propio diálogo). Al cerrar la hoja de retorno, si el botón tocado ya no existe, el foco va a
  la tarjeta del paquete. Un toque en la tarjeta a medio ver de la tira de proyectos ya no la corre bajo el dedo.

Cada uno tiene candado en `checkSecondRound`, comprobado rompiendo la regla a propósito sobre una copia del build.

### Lo que la segunda ronda propuso y no se aplicó

- **Reescribir alcances y agregados del tarifario** en lenguaje de cliente («Otro recurso, mismas reglas»,
  «Anticipo por pasarela viable»). Son textos de `portal/shared/service-pricing.js`, la fuente del portal: cambiar
  su significado sin el equipo sería inventar alcance. Queda como pregunta.
- **Forma de pago y montos de dominio y alojamiento.** No hay ninguna fuente que los defina.
- **Partir el JavaScript de entrada** (193 KB gzip; unos 160 KB sin comprimir son el texto de los artículos, que
  llega por `content/catalog`) y autoalojar las fuentes. Es un cambio de arquitectura con riesgo sobre el blog
  y el prerender: va como recomendación 2.
- **Historial para el formulario corto** (que «atrás» lo cierre). Solo existe en computadora, donde se cierra con
  Escape, la X o un clic fuera; compite con el historial del detalle del paquete.
- **«IA» / «Inteligencia artificial» en la barra** y un desplegable de categorías en las páginas de servicio.
- Tres ideas para una próxima iteración: casillas «Ya lo tengo» en «Para empezar necesitamos»; que el flotante
  recuerde el pedido armado en el detalle; y medir «Sí, ya lo envié» de la hoja de retorno como señal de
  calidad en las plataformas de anuncios (requiere crear la acción en cada una).

## Lo que no se pudo verificar

- **El sitio publicado y los destinos externos** (`www.jcanalytic.com`, `portal.jcanalytic.com`, `wa.me`, los
  sitios de los clientes): el entorno donde se hizo la auditoría no tiene salida a esos dominios. Todo se probó
  sobre el build local, que reproduce byte a byte la copia publicada.
- Qué registran en la práctica los píxeles de Google, Meta y OpenAI (sus scripts estaban bloqueados): se
  comprobó lo que el sitio les envía, no lo que ellos hacen con la página.
- Lectores de pantalla reales (NVDA, VoiceOver, TalkBack), Safari de iOS y el navegador interno de
  Instagram/Facebook, donde llega buena parte del tráfico de Meta.
- El botón o gesto «atrás» de un Android y de un iPhone reales con el detalle del paquete abierto (se probó con
  el historial de Chromium), el diálogo de impresión de Safari y Firefox (el PDF de una página se verificó en
  Chromium) y el salto de la lista de paquetes en Safari de iOS, que no compensa el desplazamiento como Chromium.

## Lo que se dejó como estaba, a propósito

El titular («Webs y sistemas con entrega a tiempo.»), la paleta, las seis preguntas frecuentes, la regla de
contacto por dispositivo, «Lo quiero» como botón de las tarjetas, los precios y alcances del tarifario, y la
ausencia de testimonios, logos o cifras de resultados que el sitio no puede respaldar. Tampoco se publicaron
medios ni condiciones de pago: no están definidos en ninguna fuente y no se inventan.

## Recomendaciones que requieren una decisión o un recurso

1. **Autoalojar las fuentes** (hoy 258 KB desde Google, con una hoja de terceros que bloquea el primer pintado;
   85 KB bajan solo por el signo ₡ y la cursiva del titular es la causa del único salto de diseño).
2. **Separar del bundle de la portada** el texto de los 12 artículos y de las páginas de servicio, y llevar a
   hojas propias el CSS de las demos que ya no están en la portada (la hoja pesa 221 KB y la portada usa menos
   de la mitad). Medido en la segunda ronda: el JavaScript de entrada pesa 193 KB con gzip más 48 KB de
   animaciones, y unos 160 KB sin comprimir son texto de artículos que la portada no muestra; la portada pide
   20 imágenes fuera de pantalla antes de cualquier desplazamiento.
3. **Página de precios indexable** (`/precios/`) generada desde el tarifario, con datos estructurados de oferta:
   casi ningún estudio local publica precios y es la búsqueda con más intención de compra.
4. **Código de consulta en cada mensaje de WhatsApp** («Consulta K7F3») para unir el chat con la visita en el
   portal. Requiere un buscador por código en el portal.
5. **Velocidad con visitas reales** (LCP, CLS, INP) hacia el portal y un tope de peso en el build. Requiere un
   tipo de evento nuevo en la ingesta del portal.
6. **Una pantalla real del portal de clientes** (con datos de demostración) junto al compromiso de los avances
   cada 72 horas: hoy se promete y no se muestra.
7. Higiene de publicación: la imagen de vista previa pesa 584 KB (al límite de lo que WhatsApp muestra); en la
   raíz quedan PNG originales de 4,6 y 5,4 MB sin uso; el píxel de OpenAI sigue en modo depuración.
8. El valor de conversión: el mismo «Lo quiero» vale $570 en computadora (formulario) y $10 en celular
   (WhatsApp). Conviene una sola regla antes de pujar por valor.

## Preguntas para el equipo

- **Pago:** ¿qué medios se aceptan (SINPE, transferencia, tarjeta), cuánto se adelanta y se entrega factura
  electrónica? Es la duda de compra que el sitio todavía no responde.
- ¿«Más pedido» en Web con reservas está respaldado por las ventas? Si no, conviene quitarlo.
- ¿Existe una agenda real para los 30 minutos (Calendly o similar)? Hoy se pide por mensaje.
- ¿Se puede mostrar una pantalla del portal de clientes con datos de demostración?
- Razón social, cédula jurídica, redes oficiales y ficha de Google Business: completan los datos estructurados
  y la confianza de un comprador corporativo.
- Nombres: los archivos dicen «Kathalina Gonzales» y «Alex Benect»; el sitio, «Catalina González» y «Alex
  Benedict». ¿Cuál es la grafía correcta?
- ¿Hay direcciones públicas para los proyectos que hoy no la tienen (Luz de Luna, Multiagencia, Soporte 2.0,
  CAVIQ)? Un sitio que se puede abrir vale más que cualquier captura.
- ¿El paquete Web con reservas cubre pedidos en línea como los de La Burrada, o eso es Software a medida?
- ¿Hay una propiedad de GA4? En el código solo está la cuenta de Google Ads, así que los eventos con sección y
  botón solo se pueden analizar en el portal.
- En Meta: ¿está apagada la «coincidencia avanzada automática»? En Google Ads: ¿las «conversiones mejoradas»
  están en detección automática? De eso depende que no viajen teléfonos con hash.
- De cada diez consultas, ¿cuántas terminan en venta y de qué paquete? Con eso se fija el valor real de una
  conversión.
- ¿Quién atiende cada una de las dos líneas de WhatsApp y en qué horario? Publicarlo ayudaría a cumplir «menos
  de 24 h».

Nuevas, de la segunda ronda:

- El «total preliminar» con agregados que arma el detalle del paquete, ¿es el que se respeta si el caso calza?
  ¿Los agregados valen el precio publicado también después de la entrega? ¿Por cuánto tiempo vale un detalle
  impreso?
- ¿Cuánto cuestan al año, aproximadamente, el dominio y el alojamiento de una Web con reservas, y los puede
  gestionar el estudio?
- ¿Se pueden reescribir con el equipo los alcances y agregados del tarifario en palabras del cliente? Por
  ejemplo, «Otro recurso, mismas reglas» y «Anticipo por pasarela viable» no se entienden sin explicación.
- ¿Hay un tablero Power BI que se pueda mostrar con datos de demostración? Hoy la prueba para quien busca
  dashboards es un sistema de transporte. ¿Se puede publicar que la licencia de Power BI la paga el cliente a
  Microsoft?
- En los paquetes más chicos (Excel, Dashboard inicial), ¿la conversación de 30 minutos es obligatoria o se
  puede mandar el alcance por escrito directo?
- ¿Quién escribe primero a la persona: siempre la misma o quien esté disponible? ¿Se pueden ofrecer franjas
  para los 30 minutos? ¿La propuesta tiene un formato que se pueda mostrar como ejemplo?
- ¿Algún anuncio apunta a una página de servicio usando `utm_content` para indicar el paquete? Desde este
  cambio esa página muestra el paquete anunciado.
- En Google Ads, ¿«Envío de formulario» cuenta una o todas las conversiones por clic? Una segunda consulta en
  la misma visita todavía suma otra. ¿Quieren una acción secundaria «WhatsApp confirmado»? ¿Se guarda el
  identificador de clic (gclid) para importar las ventas?
- ¿Qué parte de las visitas de Meta entra desde iPhone, y hay a mano un iPhone y un Android de pantalla chica
  para cinco minutos de prueba antes de publicar?
- Si en Meta o en Google hay reglas o informes basados en el nombre del paquete en español
  (`content_name` / `package_id` = «Web con reservas»), desde este cambio las páginas de servicio envían la
  clave (`pagina_web`), igual que la portada.

## Cómo comprobarlo

```bash
npm run lint && npm run build
npm run check:tools && npm run check:pricing
npm run sync:assistant && git diff --exit-code -- ../assistant-api/knowledge.json && npm run check:assistant
npm run check:site
```

El asistente lee `assistant-api/knowledge.json`: como las preguntas frecuentes cambiaron, hay que volver a
desplegar ese servicio para que responda con los textos nuevos.
