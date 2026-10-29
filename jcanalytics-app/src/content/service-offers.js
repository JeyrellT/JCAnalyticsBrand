// ============================================================================
//  src/content/service-offers.js
//  OFERTA DE CADA PÁGINA DE SERVICIO · lo que convierte una lectura en una
//  consulta: paquete con precio real, señales de "¿es para vos?", calculadora
//  de impacto con los números de la persona, qué incluye, un ejemplo real,
//  preguntas frecuentes y el formulario corto que llega al portal.
//
//  Los precios, plazos, alcances y exclusiones salen SIEMPRE de
//  portal/shared/service-pricing.js (la misma fuente del cotizador, los paquetes
//  de la portada y el portal): acá solo vive el texto de venta.
//
//  Las calculadoras son estimaciones con los números que escribe la persona.
//  No prometen ahorros: muestran cuánto cuesta hoy el trabajo manual y en
//  cuántos meses de ese costo se cubre el paquete.
// ============================================================================

const HOURS_PER_MONTH_WEEKLY = 4.33;   // semanas por mes
const BUSINESS_DAYS_PER_MONTH = 21.7;  // días hábiles por mes

/** Campo común: cuánto vale la hora del tiempo que se va en la tarea. */
const RATE_FIELD = {
  id: 'rate', min: 2, max: 150, step: 1, value: 8,
  es: { label: 'Costo por hora de ese tiempo', hint: 'En US$. Un salario de ₡600.000 al mes ronda los US$7 por hora.' },
  en: { label: 'Hourly cost of that time', hint: 'In US$. A ₡600,000 monthly salary is about US$7 per hour.' },
};

export const SERVICE_OFFERS = {
  'web-development': {
    packages: ['pagina_web', 'software_medida'],
    example: { project: 'laburrada', screen: 'home' },
    calculator: {
      fields: [
        { id: 'count', min: 1, max: 500, step: 1, value: 25, es: { label: 'Consultas por semana que podrían resolverse en la web', hint: 'Precios, horarios, disponibilidad, "¿cómo reservo?"' }, en: { label: 'Weekly inquiries the website could answer', hint: 'Prices, hours, availability, "how do I book?"' } },
        { id: 'minutes', min: 1, max: 60, step: 1, value: 6, es: { label: 'Minutos que toma atender cada una', hint: 'Leer, responder y a veces volver a preguntar.' }, en: { label: 'Minutes spent on each one', hint: 'Reading, replying and sometimes asking again.' } },
        RATE_FIELD,
      ],
      hoursPerMonth: (v) => (v.count * HOURS_PER_MONTH_WEEKLY * v.minutes) / 60,
    },
    es: {
      eyebrow: 'Desarrollo web',
      signals: [
        'Tus clientes te escriben por WhatsApp para preguntar precios u horarios que podrían ver solos.',
        'Reservás o tomás pedidos a mano y, de vez en cuando, uno se pierde.',
        'Tu web actual no se ve bien en el celular o no explica qué hacés.',
        'Tenés una hoja de Excel que en realidad debería ser parte del sistema.',
        'Querés que la gente pueda reservar o pedir sin tener que llamar.',
      ],
      calculator: {
        title: '¿Cuánto tiempo se va en atender lo que la web podría resolver?',
        intro: 'Poné tus números. El resultado es una estimación con tus datos, no una promesa de ahorro.',
        note: 'El cálculo cuenta solo el tiempo de atención. No incluye las reservas que hoy se pierden por no poder hacerse en línea.',
      },
      faq: [
        ['¿Cuánto tarda la web con reservas?', 'Entre 2 y 4 semanas desde que entregás el contenido (textos, imágenes, servicios y horarios). Si el contenido no está listo, podemos prepararlo aparte.'],
        ['¿Qué tengo que entregar yo?', 'Los textos e imágenes de hasta 5 secciones, la lista de servicios con precios y la disponibilidad para la agenda. Con eso arrancamos.'],
        ['¿Incluye dominio y alojamiento?', 'No. Se cotizan aparte o usamos los que ya tengás. Te decimos exactamente qué hace falta antes de empezar.'],
        ['¿Puedo ampliarla después?', 'Sí. Los agregados más pedidos son recordatorios por WhatsApp, anticipo con pasarela de pago y membresías o paquetes. Cada uno tiene precio publicado.'],
      ],
    },
    en: {
      eyebrow: 'Web development',
      signals: [
        'Customers message you on WhatsApp for prices or hours they could look up themselves.',
        'You take bookings or orders by hand and, every now and then, one gets lost.',
        'Your current website looks poor on a phone or does not explain what you do.',
        'You have a spreadsheet that should really be part of the system.',
        'You want people to book or order without having to call.',
      ],
      calculator: {
        title: 'How much time goes into answering what the website could resolve?',
        intro: 'Enter your numbers. The result is an estimate with your data, not a savings promise.',
        note: 'The calculation counts attention time only. It does not include bookings lost today because they cannot be made online.',
      },
      faq: [
        ['How long does the website with bookings take?', 'Between 2 and 4 weeks once you hand over the content (text, images, services and hours). If the content is not ready, we can prepare it separately.'],
        ['What do I need to provide?', 'Text and images for up to 5 sections, the service list with prices and the availability for the calendar. That is enough to start.'],
        ['Does it include domain and hosting?', 'No. They are quoted separately or we use the ones you already have. We tell you exactly what is needed before starting.'],
        ['Can I extend it later?', 'Yes. The most requested additions are WhatsApp reminders, deposits through a payment gateway and memberships or packages. Each has a published price.'],
      ],
    },
  },

  'business-intelligence': {
    packages: ['dashboard_inicial', 'power_bi'],
    example: { project: 'maison', screen: 'mediciones' },
    calculator: {
      fields: [
        { id: 'hours', min: 0.5, max: 60, step: 0.5, value: 4, es: { label: 'Horas por semana armando reportes a mano', hint: 'Exportar, copiar, pegar, revisar y mandar.' }, en: { label: 'Weekly hours building reports by hand', hint: 'Exporting, copying, pasting, checking and sending.' } },
        { id: 'people', min: 1, max: 50, step: 1, value: 2, es: { label: 'Personas que participan', hint: 'Quien arma el reporte y quien lo revisa.' }, en: { label: 'People involved', hint: 'Whoever builds the report and whoever reviews it.' } },
        RATE_FIELD,
      ],
      hoursPerMonth: (v) => v.hours * v.people * HOURS_PER_MONTH_WEEKLY,
    },
    es: {
      eyebrow: 'Dashboards y datos',
      signals: [
        'Cada lunes alguien arma el mismo reporte en Excel.',
        'Dos personas dan números distintos para la misma pregunta.',
        'Los datos viven en varios lugares (ventas, caja, redes) y nadie los junta.',
        'Decidís con el número del mes pasado porque el actual todavía no está listo.',
        'Querés ver el negocio desde el celular sin pedirle el archivo a nadie.',
      ],
      calculator: {
        title: '¿Cuánto cuesta armar el reporte a mano?',
        intro: 'Contá las horas de todas las personas que tocan el reporte cada semana.',
        note: 'El dashboard inicial parte de una fuente ordenada. Si hay que limpiar datos primero, ese trabajo se cotiza aparte y te lo decimos antes.',
      },
      faq: [
        ['¿Necesito pagar Power BI?', 'El dashboard inicial trabaja con tus archivos y no exige licencias. El Power BI de gestión publica en el servicio de Microsoft, y esas licencias se cotizan aparte.'],
        ['¿Qué datos necesitan?', 'Una fuente ordenada: un Excel, un sistema con exportación o una base de datos. Si los datos vienen sucios, ofrecemos limpieza con precio publicado.'],
        ['¿Se actualiza solo?', 'La base incluye una actualización manual documentada. La actualización programada es un agregado con precio fijo.'],
        ['¿Y si después quiero más indicadores?', 'Se agregan en bloques de cinco, con precio publicado. Preferimos empezar con los que apoyan una decisión concreta.'],
      ],
    },
    en: {
      eyebrow: 'Dashboards and data',
      signals: [
        'Every Monday someone builds the same report in Excel.',
        'Two people give different numbers for the same question.',
        'Data lives in several places (sales, cash, social) and nobody puts it together.',
        'You decide with last month’s number because the current one is not ready yet.',
        'You want to see the business from your phone without asking anyone for the file.',
      ],
      calculator: {
        title: 'How much does building the report by hand cost?',
        intro: 'Count the hours of everyone who touches the report each week.',
        note: 'The starter dashboard starts from a clean source. If data needs cleaning first, that work is quoted separately and we tell you beforehand.',
      },
      faq: [
        ['Do I need to pay for Power BI?', 'The starter dashboard works with your files and needs no licenses. The management Power BI publishes to Microsoft’s service, and those licenses are quoted separately.'],
        ['What data do you need?', 'One clean source: a spreadsheet, a system with an export or a database. If the data is messy, we offer cleaning at a published price.'],
        ['Does it refresh on its own?', 'The base includes a documented manual refresh. Scheduled refresh is an add-on with a fixed price.'],
        ['What if I want more indicators later?', 'They are added in blocks of five, at a published price. We prefer to start with the ones that support one concrete decision.'],
      ],
    },
  },

  'process-automation': {
    packages: ['power_automate', 'excel_vba'],
    example: { project: 'crimson', screen: 'levantamientos' },
    calculator: {
      fields: [
        { id: 'times', min: 1, max: 500, step: 1, value: 15, es: { label: 'Veces por semana que se repite la tarea', hint: 'Cada factura que se pasa a mano, cada aprobación que se persigue.' }, en: { label: 'Times per week the task repeats', hint: 'Every invoice typed by hand, every approval chased.' } },
        { id: 'minutes', min: 1, max: 120, step: 1, value: 12, es: { label: 'Minutos que toma cada vez', hint: 'Incluí buscar el dato, copiarlo y revisar.' }, en: { label: 'Minutes it takes each time', hint: 'Include finding the data, copying it and checking.' } },
        RATE_FIELD,
      ],
      hoursPerMonth: (v) => (v.times * HOURS_PER_MONTH_WEEKLY * v.minutes) / 60,
    },
    es: {
      eyebrow: 'Automatización',
      signals: [
        'Copiás datos de un correo o un PDF a Excel o al sistema.',
        'Perseguís aprobaciones por WhatsApp o correo.',
        'Un reporte se arma juntando varios archivos a mano.',
        'Algo se olvida cuando la persona que lo hace no está.',
        'Aparecen errores de tipeo que después cuesta encontrar.',
      ],
      calculator: {
        title: '¿Cuánto trabajo repetitivo hay escondido?',
        intro: 'Elegí una sola tarea que se repite y poné sus números.',
        note: 'Automatizamos la parte predecible. Las excepciones vuelven a una persona, y eso se acuerda antes de construir.',
      },
      faq: [
        ['¿Qué herramientas usan?', 'Power Automate, Excel con VBA o Python, según el proceso y los sistemas que ya tengás. La herramienta sigue al proceso, no al revés.'],
        ['¿Y si el proceso tiene excepciones?', 'Se definen antes de construir: qué casos sigue solo el flujo y cuáles vuelven a una persona para revisarlos. La base incluye registro y aviso de error.'],
        ['¿Necesito licencias?', 'Power Automate suele venir con Microsoft 365; lo revisamos en la primera conversación. Excel y Python no requieren licencias nuevas.'],
        ['¿Qué pasa cuando algo falla?', 'El flujo registra cada ejecución y avisa si falla. Si querés que nosotros lo vigilemos, hay soporte mensual opcional con precio publicado.'],
      ],
    },
    en: {
      eyebrow: 'Automation',
      signals: [
        'You copy data from an email or a PDF into Excel or the system.',
        'You chase approvals over WhatsApp or email.',
        'A report is built by merging several files by hand.',
        'Something is forgotten when the person who does it is away.',
        'Typing errors appear that are hard to find later.',
      ],
      calculator: {
        title: 'How much repetitive work is hidden?',
        intro: 'Pick one repeating task and enter its numbers.',
        note: 'We automate the predictable part. Exceptions go back to a person, and that is agreed before building.',
      },
      faq: [
        ['Which tools do you use?', 'Power Automate, Excel with VBA or Python, depending on the process and the systems you already have. The tool follows the process, not the other way around.'],
        ['What if the process has exceptions?', 'They are defined before building: which cases the workflow handles alone and which go back to a person for review. The base includes logging and error alerts.'],
        ['Do I need licenses?', 'Power Automate usually comes with Microsoft 365; we check it in the first conversation. Excel and Python need no new licenses.'],
        ['What happens when something fails?', 'The workflow logs every run and alerts you if it fails. If you want us to watch it, there is optional monthly support at a published price.'],
      ],
    },
  },

  'ai-integration': {
    packages: ['asistente_ia_documental', 'chatbot_atencion'],
    example: { project: 'transportesluna', screen: 'rutas' },
    calculator: {
      fields: [
        { id: 'questions', min: 1, max: 500, step: 1, value: 20, es: { label: 'Preguntas o búsquedas por día', hint: 'Lo que tu equipo busca en documentos o responde una y otra vez.' }, en: { label: 'Questions or searches per day', hint: 'What your team looks up in documents or answers again and again.' } },
        { id: 'minutes', min: 1, max: 60, step: 1, value: 5, es: { label: 'Minutos por cada una', hint: 'Buscar, leer y redactar la respuesta.' }, en: { label: 'Minutes for each one', hint: 'Searching, reading and writing the answer.' } },
        RATE_FIELD,
      ],
      hoursPerMonth: (v) => (v.questions * BUSINESS_DAYS_PER_MONTH * v.minutes) / 60,
    },
    es: {
      eyebrow: 'Integración de IA',
      signals: [
        'Tu equipo responde las mismas preguntas todos los días.',
        'La información está en documentos que nadie tiene tiempo de leer.',
        'Clasificás o resumís cosas a mano: correos, comentarios, solicitudes.',
        'Querés probar IA, pero con límites claros y revisión humana.',
        'Te preocupa que la IA invente respuestas.',
      ],
      calculator: {
        title: '¿Cuánto tiempo se va en buscar y responder lo mismo?',
        intro: 'Pensá en un solo tipo de pregunta o búsqueda que se repite.',
        note: 'La IA no reemplaza el criterio. La configuramos para responder solo con información aprobada, con referencias, y para decir cuándo no sabe.',
      },
      faq: [
        ['¿Qué documentos sirven?', 'Documentos legibles y aprobados: manuales, políticas, catálogos, procedimientos. La base cubre hasta 30 documentos o 300 páginas, lo que ocurra primero.'],
        ['¿La IA se inventa cosas?', 'Responde sobre la información aprobada y muestra de dónde sacó cada respuesta. Antes de entregar, la evaluamos con preguntas acordadas con vos.'],
        ['¿Cuánto cuesta el uso mensual?', 'El consumo de la API y el almacenamiento se cobran aparte, según el uso real. Te damos una estimación antes de empezar.'],
        ['¿Puede responder en WhatsApp?', 'El chatbot de atención cubre un canal con preguntas aprobadas y derivación a una persona. Voz y telefonía son agregados con precio publicado.'],
      ],
    },
    en: {
      eyebrow: 'AI integration',
      signals: [
        'Your team answers the same questions every day.',
        'The information sits in documents nobody has time to read.',
        'You classify or summarize things by hand: emails, comments, requests.',
        'You want to try AI, but with clear boundaries and human review.',
        'You worry that AI will make answers up.',
      ],
      calculator: {
        title: 'How much time goes into searching for and answering the same thing?',
        intro: 'Think of one type of question or search that repeats.',
        note: 'AI does not replace judgment. We configure it to answer only from approved information, with references, and to say when it does not know.',
      },
      faq: [
        ['Which documents work?', 'Readable, approved documents: manuals, policies, catalogues, procedures. The base covers up to 30 documents or 300 pages, whichever comes first.'],
        ['Does the AI make things up?', 'It answers from the approved information and shows where each answer came from. Before delivery, we evaluate it with questions agreed with you.'],
        ['What does monthly usage cost?', 'API usage and storage are charged separately, based on actual use. We give you an estimate before starting.'],
        ['Can it answer on WhatsApp?', 'The customer service chatbot covers one channel with approved questions and handoff to a person. Voice and telephony are add-ons with a published price.'],
      ],
    },
  },
};

/** Los agregados del tarifario solo tienen nombre en español; estas son sus etiquetas en inglés. */
export const EXTRA_LABELS_EN = {
  'excel_vba.report': 'Another report, same data', 'excel_vba.source': 'Another stable source', 'excel_vba.pdf': 'Batch PDF, 1 format', 'excel_vba.reconcile': 'Reconcile 2 files',
  'dashboard_inicial.page': 'Extra page on the same model', 'dashboard_inicial.indicators': '5 more indicators', 'dashboard_inicial.source': 'Related new source', 'dashboard_inicial.refresh': 'Scheduled refresh',
  'power_bi.area': 'New analysis area', 'power_bi.api': 'Documented API', 'power_bi.gateway': 'Available gateway', 'power_bi.permissions': 'Per-salesperson permissions',
  'power_automate.system': 'Additional system with API', 'power_automate.approval': 'Approval level', 'power_automate.monitor': 'Run monitoring panel', 'power_automate.desktop': 'Desktop robot without API',
  'chatbot_atencion.booking': 'Calendar with availability', 'chatbot_atencion.crm': 'CRM logging', 'chatbot_atencion.reminders': 'Approved reminders', 'chatbot_atencion.orders': 'Order status via API',
  'pagina_web.resource': 'Another resource, same rules', 'pagina_web.whatsapp': 'WhatsApp reminders', 'pagina_web.payment': 'Deposit via a viable gateway', 'pagina_web.membership': 'Memberships or packages',
  'software_medida.form': 'Form over existing data', 'software_medida.module': 'Module with new rules', 'software_medida.api': 'API integration', 'software_medida.portal': 'Client portal',
  'asistente_ia_documental.collection': 'Another equivalent collection', 'asistente_ia_documental.sync': 'Repository sync', 'asistente_ia_documental.permissions': 'Per-department permissions', 'asistente_ia_documental.crm_actions': 'Controlled CRM actions',
};

/** Cómo trabajamos: los compromisos públicos del estudio, iguales en toda la web. */
export const WORK_PROMISES = {
  es: [
    ['Primera conversación de 30 minutos, sin costo', 'Entendemos tu objetivo y cómo trabajás hoy. Salís con una recomendación aunque no contratés.'],
    ['Alcance y precio fijo por escrito', 'Lo que incluye, lo que no y cuánto cuesta, antes de empezar. Sin sorpresas al final.'],
    ['Avances cada 72 horas en tu portal de clientes', 'Cada cliente tiene acceso a un portal donde ve etapas, avances, entregables por aprobar, documentos y reuniones.'],
    ['30 días de soporte después de la entrega', 'Corregimos defectos del alcance entregado sin costo. Después, soporte mensual opcional.'],
  ],
  en: [
    ['A free first 30-minute conversation', 'We understand your goal and how you work today. You leave with a recommendation even if you do not hire us.'],
    ['Scope and fixed price in writing', 'What is included, what is not and how much it costs, before starting. No surprises at the end.'],
    ['Progress every 72 hours in your client portal', 'Every client gets access to a portal with stages, progress, deliverables to approve, documents and meetings.'],
    ['30 days of support after delivery', 'We fix defects within the delivered scope at no cost. After that, optional monthly support.'],
  ],
};
