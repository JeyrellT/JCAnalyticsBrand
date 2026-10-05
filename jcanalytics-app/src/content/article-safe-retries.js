const sources = [
  { title: 'Stripe — Idempotent requests', url: 'https://docs.stripe.com/api/idempotent_requests' },
  { title: 'Stripe — Handle duplicate webhook events', url: 'https://docs.stripe.com/webhooks#handle-duplicate-events' },
  { title: 'Microsoft Azure — Retry pattern', url: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/retry' },
  { title: 'Amazon Builders’ Library — Making retries safe with idempotent APIs', url: 'https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/' },
];

export const safeRetriesArticle = {
  id: 'safe-retries',
  topic: 'operations',
  tool: 'retry-simulator',
  image: '/images/journal/systems.webp',
  minutes: 8,
  published: '2026-10-04',
  en: {
    slug: 'stop-duplicate-actions-on-retry',
    title: 'Stop duplicate actions when an automation retries',
    summary: 'A practical guide and interactive lab for repeated requests, lost confirmations and changes that should never pass as a retry.',
    takeaway: 'Keep the identity of the intended operation, distinguish uncertainty from failure, and verify an ambiguous result before authorizing another action.',
    sections: [
      {
        id: 'name-the-action',
        heading: 'Name the action you cannot afford to repeat',
        paragraphs: [
          'Start with a single business action: adding an order, sending a notice or creating a delivery task. Write down where its result becomes visible and who notices a duplicate. A workflow can complete successfully while still producing an extra row.',
          'Our synthetic example is a fictional workshop preparing two units for order DEMO-ORDER-017. The simulator sends no network requests and creates no real order. It lets you watch the number of attempted requests separately from the number of actions at a fictional destination.',
          'Choose the normal scenario. Send the request once, then repeat it: two attempts and one action. Ask the task owner to identify the original confirmation and explain where a pending case would appear.'
        ],
      },
      {
        id: 'keep-the-identity',
        heading: 'Give the intended operation a stable identity',
        paragraphs: [
          'Attach an operation reference when the team decides to perform the action. Keep that reference through retries, restarts and handoffs. A new random reference on every attempt makes an old action look new. Scope references to the relevant account and operation; one label reused across unrelated work cannot express what was authorized.',
          'Stripe documents a concrete provider contract: repeated requests with the same idempotency key can return the saved result, while changed parameters are rejected. Its retention and execution rules matter; check the current contract for the endpoint you use.',
          'Now choose the changed-data scenario. The first request asks for two units. The retry asks for three using the same reference. The simulator rejects that change and preserves the original action. Correcting an order needs its own explicit business decision. A second intentionally authorized order may have identical contents and still be a separate operation.'
        ],
      },
      {
        id: 'check-uncertainty',
        heading: 'Keep a missing confirmation visibly unresolved',
        paragraphs: [
          'Choose the lost-response scenario and send once. The destination counter becomes one, but the sender has no confirmation. The simulator shows both perspectives because it controls the entire fictional exercise. A real caller would need evidence from the destination before claiming that the action happened.',
          'Azure’s Retry pattern explains the risk of repeating a completed operation after its response is lost. It also recommends adapting retries to the failure, using suitable delays and limiting attempts. A timeout by itself does not establish that nothing changed.',
          'Press retry. This teaching model holds the request without another action. Press verify to inspect its fictional destination record, then retry again. The confirmed result is now reusable. In a real workflow, assign unresolved cases to someone who can inspect the provider or system of record. Record the operation reference, current evidence and next check. An empty search result may still be insufficient evidence, especially when the destination has delayed visibility.'
        ],
      },
      {
        id: 'separate-notification',
        heading: 'Treat an arriving notification as a separate input',
        paragraphs: [
          'Some automations begin with a webhook: a service sends a notification that something happened. Receiving that notification again does not automatically authorize another delivery, message or spreadsheet row.',
          'Stripe’s webhook guidance distinguishes repeated delivery of an event from separate event objects that concern the same object and event type. It also warns that events can arrive out of order. These are provider-specific facts to consider when defining what your integration recognizes as a duplicate.',
          'For the workshop rehearsal, write two fictional notification cards for the same preparation request. Ask the operator to find the existing operation before deciding what happens next. Then introduce a legitimate correction. Does the process preserve that correction, or discard it merely because the order reference has appeared before? Keep authentication, valid state changes and duplicate handling as separate checks; recognizing a familiar reference does not prove that a message is authorized.'
        ],
      },
      {
        id: 'production-boundary',
        heading: 'Make the production boundary explicit',
        paragraphs: [
          'The browser model forgets everything when reset or reloaded. It runs sequentially in memory, so it cannot demonstrate recovery after a server crash or two workers acting together. A successful demonstration is an explanation of behavior, not evidence that a live integration has those guarantees.',
          'For production, require durable operation records and an atomic, unique reservation before competing workers claim the same operation. A separate read followed by an insert leaves a race. AWS’s discussion of idempotent APIs explains why recording the token and the associated mutations need an atomic boundary where the service controls those changes.',
          'An external action can still succeed before your local confirmation is saved. Use the provider’s supported idempotency mechanism where available, and reconcile ambiguous outcomes against its records. A local reservation cannot make an unrelated service part of your transaction. Ask the implementer to show what happens at that boundary, how long references remain useful and who owns cases that cannot be resolved automatically.'
        ],
      },
      {
        id: 'test-the-boundary',
        heading: 'Test the awkward cases before widening the workflow',
        paragraphs: [
          'Download the bilingual CSV beside the simulator. Its interactive cases have explicit expected counters. The production-review rows describe checks that this browser cannot perform.',
          'Run all three exercises with the task owner. Have them predict the result before clicking. Record disagreements as requirements to resolve. Deciding whether a correction replaces an earlier request belongs to the business process; the retry mechanism should not invent that policy.',
          'Before a live pilot, rehearse interrupted processing, unavailable evidence and simultaneous workers in an isolated test environment. Compare attempted requests, confirmed operations and unresolved cases. Avoid placing full customer messages or credentials in a troubleshooting log. Give pending work an owner and a review time. Expand only when the team can explain an unexpected result, find its evidence and recover without blindly repeating the action.'
        ],
      },
    ],
    discussion: [
      'Which action in your workflow would be most costly to repeat, and where could you verify its result?',
      'Who can decide whether an uncertain operation should wait, be corrected or be attempted again?',
      'What test would demonstrate recovery after the destination succeeds but your confirmation is lost?',
    ],
    sources,
  },
  es: {
    slug: 'evitar-acciones-duplicadas-al-reintentar',
    title: 'Cómo evitar acciones duplicadas cuando una automatización reintenta',
    summary: 'Una guía práctica con laboratorio para entender solicitudes repetidas, confirmaciones perdidas y cambios que requieren otra decisión.',
    takeaway: 'Conservá la identidad de la operación, distinguí un resultado incierto de un fallo y comprobá lo ocurrido antes de autorizar otra acción.',
    sections: [
      {
        id: 'name-the-action',
        heading: 'Nombrá la acción que no conviene repetir',
        paragraphs: [
          'Empezá por una acción concreta: agregar un pedido, enviar un aviso o crear una tarea de entrega. Anotá dónde se ve su resultado y quién detectaría un duplicado. Un flujo puede terminar correctamente y aun así producir una fila extra.',
          'El ejemplo sintético es un taller ficticio que prepara dos unidades para el pedido DEMO-ORDER-017. El simulador no envía solicitudes de red ni crea pedidos reales. Permite observar por separado las solicitudes intentadas y las acciones realizadas en un destino ficticio.',
          'Elegí el escenario normal. Enviá una solicitud y repetila: dos intentos y una acción. Pedile a quien realiza la tarea que identifique la confirmación original y explique dónde aparecería un caso pendiente.'
        ],
      },
      {
        id: 'keep-the-identity',
        heading: 'Conservá la identidad de la operación',
        paragraphs: [
          'Asigná una referencia cuando el equipo decide realizar la acción. Conservála durante reintentos, reinicios y cambios de responsable. Una referencia aleatoria nueva por intento hace que una operación anterior parezca nueva. Delimitá las referencias por cuenta y operación: reutilizar una etiqueta para trabajos distintos impide entender qué se autorizó.',
          'Stripe documenta un contrato concreto: repetir una solicitud con la misma clave de idempotencia permite recuperar su resultado guardado; cambiar sus parámetros se rechaza. Sus reglas de conservación y ejecución importan. Comprobá el contrato vigente del endpoint que uses.',
          'Elegí ahora el escenario con datos cambiados. La primera solicitud pide dos unidades y el reintento pide tres con la misma referencia. El simulador rechaza el cambio y conserva la acción original. Corregir un pedido necesita una decisión explícita. Otro pedido autorizado puede tener contenido idéntico y seguir siendo una operación distinta.'
        ],
      },
      {
        id: 'check-uncertainty',
        heading: 'Mantené visible una confirmación pendiente',
        paragraphs: [
          'Elegí el escenario de respuesta perdida y enviá una vez. El destino cuenta una acción, pero quien envía no tiene confirmación. El simulador muestra ambas perspectivas porque controla todo el ejercicio ficticio. En un sistema real, quien envía necesitaría evidencia del destino para afirmar que la acción ocurrió.',
          'El patrón Retry de Azure explica el riesgo de repetir una operación completada cuando se pierde su respuesta. También recomienda adaptar los reintentos al fallo, con esperas adecuadas e intentos limitados. Un timeout por sí solo no demuestra que nada cambió.',
          'Presioná reintentar. Este modelo retiene la solicitud sin agregar otra acción. Usá verificar para consultar el registro ficticio y volvé a reintentar: ahora la confirmación es reutilizable. En un flujo real, asigná los casos inciertos a alguien que pueda consultar el proveedor o sistema de referencia. Anotá la operación, la evidencia disponible y la siguiente comprobación. Una búsqueda vacía tampoco siempre demuestra ausencia, especialmente cuando los registros tardan en aparecer.'
        ],
      },
      {
        id: 'separate-notification',
        heading: 'Separá la notificación de la acción',
        paragraphs: [
          'Algunas automatizaciones empiezan con un webhook: un servicio avisa que algo ocurrió. Recibir otra vez ese aviso no autoriza automáticamente otra entrega, mensaje o fila de Excel.',
          'La guía de webhooks de Stripe distingue la entrega repetida de un evento de otros eventos que afectan al mismo objeto y tipo de evento. También advierte que pueden llegar desordenados. Son hechos específicos del proveedor que conviene considerar al definir qué reconoce tu integración como duplicado.',
          'Para ensayar el caso del taller, prepará dos avisos ficticios sobre la misma solicitud. Pedile a quien opera que encuentre la operación existente antes de decidir el siguiente paso. Después agregá una corrección legítima. ¿El proceso conserva el cambio o lo descarta porque ya había visto el pedido? Separá autenticación, cambios de estado válidos y control de duplicados: reconocer una referencia conocida no demuestra que el mensaje esté autorizado.'
        ],
      },
      {
        id: 'production-boundary',
        heading: 'Explicá qué necesita un sistema real',
        paragraphs: [
          'El modelo del navegador olvida todo al reiniciar o recargar. Trabaja secuencialmente en memoria; no demuestra recuperación después de una caída del servidor ni ante dos procesos simultáneos. Una demostración correcta explica un comportamiento, pero no acredita esas garantías en una integración real.',
          'En producción, necesitás registros durables y una reserva única atómica antes de que dos procesos reclamen la misma operación. Consultar y después insertar por separado deja una carrera. AWS explica por qué registrar la clave y los cambios asociados requiere un límite atómico cuando el servicio controla esas modificaciones.',
          'Una acción externa todavía puede completarse antes de guardar su confirmación local. Usá la idempotencia que admita el proveedor y conciliá resultados ambiguos contra sus registros. Una reserva local no incorpora otro servicio a tu transacción. Pedile a quien implementa que muestre qué sucede en ese límite, cuánto tiempo sirven las referencias y quién atiende los casos que no se pueden resolver automáticamente.'
        ],
      },
      {
        id: 'test-the-boundary',
        heading: 'Probá las dificultades antes de ampliar el flujo',
        paragraphs: [
          'Descargá el CSV bilingüe junto al simulador. Los casos interactivos indican los contadores esperados. Las filas de revisión para producción describen comprobaciones que este navegador no puede realizar.',
          'Ensayá los tres escenarios con quien realiza la tarea. Pedile que anticipe cada resultado. Registrá los desacuerdos como decisiones pendientes. Determinar si una corrección reemplaza una solicitud anterior pertenece al proceso del negocio; el mecanismo de reintentos no debería inventar esa política.',
          'Antes de un piloto real, probá interrupciones, evidencia no disponible y procesos simultáneos en un entorno de pruebas aislado. Compará intentos, operaciones confirmadas y casos pendientes. Evitá guardar mensajes completos de clientes o credenciales en registros de diagnóstico. Asigná responsable y momento de revisión al trabajo pendiente. Ampliá el flujo cuando el equipo pueda explicar un resultado inesperado, encontrar su evidencia y recuperarse sin repetir la acción a ciegas.'
        ],
      },
    ],
    discussion: [
      '¿Qué acción de tu flujo sería más costosa de repetir y dónde podrías comprobar su resultado?',
      '¿Quién puede decidir si una operación incierta debe esperar, corregirse o intentarse otra vez?',
      '¿Qué prueba mostraría la recuperación si el destino completa la acción, pero se pierde la confirmación?',
    ],
    sources,
  },
};
