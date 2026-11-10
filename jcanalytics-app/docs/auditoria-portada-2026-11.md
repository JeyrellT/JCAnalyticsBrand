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

## Lo que no se pudo verificar

- **El sitio publicado y los destinos externos** (`www.jcanalytic.com`, `portal.jcanalytic.com`, `wa.me`, los
  sitios de los clientes): el entorno donde se hizo la auditoría no tiene salida a esos dominios. Todo se probó
  sobre el build local, que reproduce byte a byte la copia publicada.
- Qué registran en la práctica los píxeles de Google, Meta y OpenAI (sus scripts estaban bloqueados): se
  comprobó lo que el sitio les envía, no lo que ellos hacen con la página.
- Lectores de pantalla reales (NVDA, VoiceOver, TalkBack), Safari de iOS y el navegador interno de
  Instagram/Facebook, donde llega buena parte del tráfico de Meta.

## Lo que se dejó como estaba, a propósito

El titular («Webs y sistemas con entrega a tiempo.»), la paleta, las seis preguntas frecuentes, la regla de
contacto por dispositivo, «Lo quiero» como botón de las tarjetas, los precios y alcances del tarifario, y la
ausencia de testimonios, logos o cifras de resultados que el sitio no puede respaldar. Tampoco se publicaron
medios ni condiciones de pago: no están definidos en ninguna fuente y no se inventan.

## Recomendaciones que requieren una decisión o un recurso

1. **Autoalojar las fuentes** (hoy 258 KB desde Google, con una hoja de terceros que bloquea el primer pintado;
   85 KB bajan solo por el signo ₡ y la cursiva del titular es la causa del único salto de diseño).
2. **Separar del bundle de la portada** el texto de los 12 artículos y de las páginas de servicio, y llevar a
   hojas propias el CSS de las demos que ya no están en la portada (la hoja pesa 212 KB y la portada usa menos
   de la mitad).
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

## Cómo comprobarlo

```bash
npm run lint && npm run build
npm run check:tools && npm run check:pricing
npm run sync:assistant && git diff --exit-code -- ../assistant-api/knowledge.json && npm run check:assistant
npm run check:site
```

El asistente lee `assistant-api/knowledge.json`: como las preguntas frecuentes cambiaron, hay que volver a
desplegar ese servicio para que responda con los textos nuevos.
