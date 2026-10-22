# WhatsApp: avisos a clientes y asistente

El portal se conecta a la **WhatsApp Cloud API de Meta** para tres cosas:

1. **Avisos a clientes.** Todo lo que el portal ya le avisa a un cliente (avance registrado, entregable por revisar, documento nuevo, cambio en una solicitud) sale también por WhatsApp a las personas que lo activaron. Se suman los recordatorios de reuniones y el botón **Enviar aviso** en la ficha del cliente.
2. **Asistente.** Cuando un cliente escribe, el asistente le cuenta cómo van sus proyectos, qué tiene por aprobar y sus próximas reuniones, con los datos reales de **su** portal. Cuando hace falta una persona, le pasa el caso al equipo.
3. **Bandeja del equipo** (`/whatsapp`). Desde ahí se responde, se toma el control o se le devuelve al asistente, y se revisa la cola de avisos y el estado de la conexión.

Sin las variables de Meta, el portal funciona igual que antes: los avisos quedan solo dentro del portal y la bandeja explica qué falta.

## Cómo se activa para cada cliente (opt-in)

Ningún cliente recibe mensajes por WhatsApp sin pedirlo:

1. En su portal: **Mi cuenta → Avisos por WhatsApp → Activar avisos por WhatsApp**.
2. El portal le da un código (`ACTIVAR K7Q4M2`, válido 30 minutos y de un solo uso) y un enlace `wa.me` con el mensaje listo.
3. El cliente lo envía **desde su WhatsApp**. Eso prueba que el número es suyo. El número queda vinculado a su cuenta y los avisos, activos.

Después puede **pausarlos** (desde el portal o escribiendo `AVISOS NO`), **reactivarlos** (`AVISOS SI`) o **desvincular** el número. Tras 5 códigos fallidos desde un mismo número, ese número queda bloqueado 24 horas. Además, hay un tope de 30 códigos fallidos por hora sumando todos los números. En la ficha del cliente, el equipo ve quién tiene los avisos activos, sin el número completo.

## Cómo salen los avisos (cola con reintentos)

- Cada aviso entra **una sola vez** a la cola (`wa_outbox.dedupe_key` único).
- **Horario:** de 07:00 a 20:00 (hora de Costa Rica). Fuera de esa franja, el aviso queda para la mañana siguiente. Los urgentes salen de inmediato, igual que los recordatorios de reuniones que empiezan en menos de 12 horas.
- **Ventana de 24 h (regla de Meta):** si el cliente escribió en las últimas 24 horas, el aviso va como texto normal. Si no, va con una **plantilla aprobada**.
- **Antes de cada envío** se vuelve a comprobar el permiso: la cuenta debe seguir activa, con el número vinculado y los avisos activos. También se comprueba que la reunión no se haya cancelado ni movido. Si algo no se cumple, el aviso queda *Omitido*.
- **Errores transitorios** (límite de Meta, 5xx, red, tiempo de espera): hasta 3 intentos, separados por 5 minutos. Otros errores dejan el aviso en *Falló* con el motivo. Desde **WhatsApp → Avisos** se puede reintentar.
- El programador corre cada minuto (el mismo de las automatizaciones). Un admin puede forzar la corrida con **Conexión → Enviar la cola ahora**.

Los recordatorios de reuniones salen `wa_meeting_reminder_hours` horas antes (24 por defecto; 0 los apaga), solo para citas con cliente. Las reuniones internas nunca se recuerdan.

## El asistente

Es un **motor de reglas puro** (`server/whatsapp/bot.mjs`): recibe el estado y el mensaje y devuelve la respuesta y el estado nuevo, sin red ni base de datos. Se prueba con conversaciones completas.

- Entiende faltas y abreviaturas de chat (`q`, `xfa`, `reu`, `entregbles`…).
- Responde con los datos del portal de esa cuenta: proyectos activos con etapas, entregables por aprobar y próximas reuniones. Un número sin vincular **no** recibe información de proyectos.
- **Pasa el caso al equipo** cuando alguien pide una persona (primero pregunta el motivo), cuando hay una urgencia, una queja o una consulta de pagos, cuando llega un archivo o un audio, o cuando no entiende dos veces seguidas.
- Al pasar el caso, la conversación queda **Por atender**, el asistente se calla 30 minutos y le llega un aviso (buzón y push, categoría *Portal de clientes*) a quien lleva la cuenta del cliente. Si el cliente no tiene responsable, el aviso va a los admin.
- Nunca inventa precios, fechas ni compromisos, y no usa emojis. Si le preguntan si es un bot, lo dice.
- Espera a que la persona termine de escribir (6 s de silencio, 12 s si mandó un adjunto o el mensaje parece incompleto, con un máximo de 20 s) y contesta todo junto, en dos burbujas como máximo, con "escribiendo…".

### Humano en el bucle

| Situación | Qué pasa |
|---|---|
| Alguien del equipo responde desde `/whatsapp` | El asistente se calla 30 minutos y la conversación queda atendida. |
| **Tomar el control** | El asistente no contesta hasta **Devolver al asistente**. |
| El cliente escribe mientras el equipo tiene la conversación | No contesta el asistente: la conversación vuelve a *Por atender* y se avisa al equipo. |
| Pasaron más de 24 h desde el último mensaje del cliente | El panel no deja enviar texto libre. Para escribirle, se usa **Enviar aviso** en su ficha, que sale como plantilla. |

## Puesta en marcha en Meta

1. **Portafolio comercial** (business.facebook.com) con los datos del negocio completos y verificación del negocio.
2. **Cuenta de WhatsApp Business** y **número** (el número no puede estar usándose en la app de WhatsApp). Anotar el *Phone number ID* y el *WABA ID*.
3. **Método de pago** en la cuenta de WhatsApp. Sin él, los envíos fallan aunque contestar sea gratis.
4. **App de Meta** de tipo Negocio con el producto WhatsApp. Copiar el *App Secret*.
5. **Usuario del sistema** con la app y la cuenta de WhatsApp asignadas, y un **token permanente** con `whatsapp_business_messaging` y `whatsapp_business_management`.
6. **Variables en Railway** (ver la tabla de abajo). Desplegar.
7. **Webhook:** en la app de Meta → WhatsApp → Configuración, URL `https://portal.jcanalytic.com/webhooks/whatsapp`, con el token de verificación y suscripción al campo **messages**. El token de verificación sale de `META_APP_SECRET`. Para verlo, en el servidor:
   ```sh
   node -e "import('./server/whatsapp/meta.mjs').then(m => console.log(m.verifyToken()))"
   ```
   O definí `META_VERIFY_TOKEN` (24 caracteres como mínimo). El token derivado no es un segundo secreto: quien tenga `META_APP_SECRET` lo puede calcular, y lo que protege el webhook es la firma.
8. **Plantillas:** crear en WhatsApp Manager, categoría **Utilidad**, las tres de `shared/whatsapp.js` con el nombre y el texto exactos (también se ven en **WhatsApp → Conexión**). Si Meta las reclasifica como *Marketing*, redactá una versión más transaccional en lugar de insistir con la misma.
9. Con las plantillas aprobadas: `WHATSAPP_AVISOS=activos`.
10. **Prueba:** desde otro teléfono escribí "Hola", y después "quiero hablar con alguien". Debe llegar el aviso al equipo y el asistente debe callarse.

## Variables de entorno

| Variable | Tipo | Uso |
|---|---|---|
| `META_APP_SECRET` | secreto | Firma de cada webhook (HMAC SHA-256). De él se deriva el token de verificación. Mínimo 32 caracteres. |
| `WHATSAPP_TOKEN` | secreto | Token permanente del usuario del sistema. |
| `WHATSAPP_PHONE_NUMBER_ID` | id | Id del número en Meta (no es el teléfono). |
| `WHATSAPP_DISPLAY_NUMBER` | dato | El número en dígitos (`50670330596`), para el enlace de activación. |
| `WHATSAPP_WABA_ID` | id | Opcional: cuenta de WhatsApp Business. |
| `WHATSAPP_AVISOS` | interruptor | `activos` enciende la cola de avisos. Sin esto, el asistente contesta pero no se envían avisos. |
| `WHATSAPP_TEMPLATE_LANG` | dato | Idioma **exacto** con que se crearon las plantillas (`es`, `es_MX`…). Por defecto `es`. |
| `META_VERIFY_TOKEN` | opcional | Token de verificación propio. Si falta, se deriva del secreto. |
| `META_GRAPH_VERSION` | opcional | Por defecto `v23.0`. |

Las variables de WhatsApp van **solo** en Railway, nunca en el repositorio ni en una variable `VITE_`. Si un token o el secreto de la app aparece en un chat, un correo o una captura, se considera comprometido y se **rota** en Meta.

## Seguridad y privacidad

- `/webhooks/whatsapp` no usa cookie ni el encabezado anti-CSRF. Lo autentica la **firma HMAC del cuerpo crudo**, comparada en tiempo constante, con un tope de 512 KB. Meta recibe `200` de inmediato y el trabajo sigue en segundo plano.
- **Deduplicación** por el id de mensaje de Meta: un webhook reenviado no se contesta dos veces.
- **Aislamiento:** el asistente solo lee datos de la empresa de la cuenta vinculada a ese número, y solo lo que el cliente ve en su portal. Nunca montos, tareas ni notas internas.
- Las cédulas y los números largos que el cliente escribe en el chat se guardan ocultos (`[número oculto]`).
- Los errores de Meta se registran sin el token, sin el secreto y sin números de 6 o más dígitos. El panel muestra solo los **nombres** de las variables que faltan.
- La bandeja es para el equipo de operación (acceso `user`): los inversionistas y las cuentas de cliente no tienen acceso. Los avisos a un cliente los envían admin, socios o quien lleva la cuenta.
- Los adjuntos no se descargan ni se guardan en el servidor: queda solo la referencia de Meta.

## Archivos

| Archivo | Qué hace |
|---|---|
| `shared/whatsapp.js` | Plantillas, estados, bandejas, horario y teléfonos (servidor, demo e interfaz). |
| `server/whatsapp/bot.mjs` | Motor de conversación puro. |
| `server/whatsapp/webhook.mjs` | Lectura del webhook (puro y tolerante). |
| `server/whatsapp/meta.mjs` | Graph API, firma y token de verificación (solo Node). |
| `server/whatsapp/http.mjs` | Ruta `/webhooks/whatsapp` (solo Node). |
| `server/whatsapp/service.mjs` | Cola de avisos, entrada de mensajes, pausas y vínculo con código. |
| `server/routes/whatsapp.mjs` | API del panel, del aviso a clientes y del portal del cliente. |
| `src/pages/WhatsApp.jsx` | Bandeja, avisos y conexión. |
| Migración 11 en `server/schema.mjs` | `wa_conversations`, `wa_messages`, `wa_outbox` y columnas `wa_*` en `client_accounts`. |

## Pendiente para una fase 2

- IA de respaldo que solo **reinterprete** lo que el motor no entiende (la respuesta sigue saliendo de los textos aprobados), con aprendizaje de frases.
- Voz a texto para los audios.
- Ver en el panel las fotos y los documentos (proxy hacia Meta con CSP `sandbox`).
- Messenger e Instagram con la misma lógica.
