// Blog entries. Only claims backed by the listed public sources; examples are marked as synthetic.
export const blogArticles = [
  {
    id: 'cr-continuous-improvement',
    topic: 'operations',
    image: '/images/journal/systems.webp',
    minutes: 5,
    published: '2026-10-20',
    en: {
      slug: 'continuous-improvement-costa-rica-2026',
      title: 'Continuous improvement in Costa Rica: what is on the 2026 calendar',
      summary: 'Lean Six Sigma is an active topic for Costa Rican industry this year. Here is what the public calendar shows and how a small team can start without a certification.',
      takeaway: 'Use the national events as a source of ideas, but start with one repeated problem in your own operation and measure it before and after.',
      sections: [
        {
          id: 'calendar',
          heading: 'What the public calendar shows',
          paragraphs: [
            'The Cámara de Industrias de Costa Rica (CICR) announced the XIII Foro Nacional Lean & Six Sigma 2026, with a virtual session on 9 April and an in-person main event on 16 April in San José, followed by benchmarking visits and a master class on 17 April. Its Congreso de Excelencia is scheduled for 18 November 2026 at the Centro de Convenciones, where the finalists of the Compromiso con la Excelencia 2026 program are expected to present.',
            'Dates come from public announcements and may change, so confirm them with the organizer before planning to attend. This note does not cover event outcomes.'
          ]
        },
        {
          id: 'demand',
          heading: 'Why it matters beyond large plants',
          paragraphs: [
            'Public job postings, such as a continuous improvement specialist role at a manufacturing plant in Belén, show that Lean tools are a stated skill requirement for local employers. That does not tell us how widely small businesses use them. We found no independent adoption figures for Costa Rica, so treat any percentage you read elsewhere with caution.',
            'The underlying ideas are not limited to factories. Any team that repeats a task, such as quoting, scheduling or invoicing, can look for waiting, rework and handoffs.'
          ]
        },
        {
          id: 'start-small',
          heading: 'A starting point without a certification',
          paragraphs: [
            'Synthetic example: a fictional bakery notices that delivery orders are often corrected after being written down. Instead of buying software, the owner counts corrections for two weeks, lists the three most common causes and changes one step, such as reading the order back to the customer. Then the count is repeated.',
            'The method is simple: pick one problem, measure it, change one thing, measure again. Belts and formal programs can add rigor later, once you know which problems justify it.'
          ]
        },
        {
          id: 'measure',
          heading: 'How to measure without overcomplicating it',
          paragraphs: [
            'You do not need a dashboard or an elaborate spreadsheet. A printed sheet next to where the work happens, with one column per day and a tally mark each time the problem appears, is usually enough for the first two weeks. What matters is that the person doing the task can record it in seconds without stopping work.',
            'Before you start, define in one sentence what counts as a problem. For example, "an order that had to be corrected after it was written down." If each person understands something different, the count cannot be used to compare before and after.',
            'At the end of the period, review the marks together and note the likely cause of each one. Grouping similar causes often shows that a few of them explain most cases. That small group is where it makes sense to start.',
            'After the change, repeat the same count, with the same definition and for the same length of time. If the number drops, document the new step so it does not depend on anyone remembering it. If it does not drop, try the next cause on the list instead of abandoning the method.'
          ]
        }
      ],
      discussion: [
        'Which task does your team repeat weekly that regularly needs correction?',
        'What could you count for two weeks to see how often it happens?',
        'Which single step could you change first, and how would you know it helped?'
      ],
      sources: [
        { title: 'La República — Excelencia empresarial será motivo de análisis en congreso de la Cámara de Industrias', url: 'https://www.larepublica.net/excelencia-empresarial-sera-motivo-de-analisis-en-congreso-de-la-camara-de-industrias/' }
      ]
    },
    es: {
      slug: 'mejora-continua-costa-rica-2026',
      title: 'Mejora continua en Costa Rica: lo que muestra el calendario 2026',
      summary: 'Lean Six Sigma es un tema activo para la industria costarricense este año. Qué muestra el calendario público y cómo un equipo pequeño puede empezar sin certificación.',
      takeaway: 'Usá los eventos nacionales como fuente de ideas, pero empezá con un problema repetido de tu propia operación y medilo antes y después.',
      sections: [
        {
          id: 'calendar',
          heading: 'Lo que muestra el calendario público',
          paragraphs: [
            'La Cámara de Industrias de Costa Rica (CICR) anunció el XIII Foro Nacional Lean & Six Sigma 2026, con una sesión virtual el 9 de abril y un evento principal presencial el 16 de abril en San José, seguido de visitas de benchmarking y una máster class el 17 de abril. Su Congreso de Excelencia está programado para el 18 de noviembre de 2026 en el Centro de Convenciones, donde se espera que presenten los finalistas del programa Compromiso con la Excelencia 2026.',
            'Las fechas provienen de anuncios públicos y pueden cambiar, así que confirmalas con el organizador antes de planear asistir. Esta nota no cubre los resultados de los eventos.'
          ]
        },
        {
          id: 'demand',
          heading: 'Por qué importa más allá de las plantas grandes',
          paragraphs: [
            'Las ofertas de empleo públicas, como un puesto de especialista en mejora continua en una planta de manufactura en Belén, muestran que las herramientas Lean son una habilidad que piden empleadores locales. Eso no dice qué tanto las usan las empresas pequeñas. No encontramos cifras independientes de adopción en Costa Rica, así que tomá con cautela cualquier porcentaje que leás por ahí.',
            'Las ideas de fondo no se limitan a las fábricas. Cualquier equipo que repite una tarea, como cotizar, agendar o facturar, puede buscar esperas, reprocesos y traspasos.'
          ]
        },
        {
          id: 'start-small',
          heading: 'Un punto de partida sin certificación',
          paragraphs: [
            'Ejemplo sintético: una panadería ficticia nota que los pedidos a domicilio se corrigen seguido después de anotarse. En vez de comprar software, la dueña cuenta las correcciones durante dos semanas, lista las tres causas más comunes y cambia un paso, como repetirle el pedido al cliente. Después repite el conteo.',
            'El método es simple: elegí un problema, medilo, cambiá una cosa y medí de nuevo. Los cinturones y los programas formales pueden sumar rigor después, cuando sepás qué problemas lo justifican.'
          ]
        },
        {
          id: 'measure',
          heading: 'Cómo medir sin complicarse',
          paragraphs: [
            'No hace falta un tablero ni una hoja de cálculo elaborada. Una hoja impresa junto al lugar donde ocurre el trabajo, con una columna por día y una marca cada vez que aparece el problema, suele bastar para las primeras dos semanas. Lo importante es que la persona que hace la tarea pueda anotar en segundos, sin dejar de trabajar.',
            'Antes de empezar, definan en una frase qué cuenta como problema. Por ejemplo, "un pedido que hubo que corregir después de anotarlo". Si cada persona entiende algo distinto, el conteo no sirve para comparar el antes y el después.',
            'Al terminar el periodo, revisen juntos las marcas y anoten la causa probable de cada una. Agrupar causas parecidas suele mostrar que unas pocas explican la mayoría de los casos. Ese grupo pequeño es por donde conviene empezar.',
            'Después del cambio, repitan el mismo conteo, con la misma definición y durante el mismo tiempo. Si la cifra baja, documenten el paso nuevo para que no dependa de la memoria de nadie. Si no baja, prueben la siguiente causa de la lista en lugar de abandonar el método.'
          ]
        }
      ],
      discussion: [
        '¿Qué tarea repite su equipo cada semana y suele necesitar correcciones?',
        '¿Qué podrían contar durante dos semanas para ver con qué frecuencia ocurre?',
        '¿Qué paso cambiarían primero y cómo sabrían que ayudó?'
      ],
      sources: [
        { title: 'La República — Excelencia empresarial será motivo de análisis en congreso de la Cámara de Industrias', url: 'https://www.larepublica.net/excelencia-empresarial-sera-motivo-de-analisis-en-congreso-de-la-camara-de-industrias/' }
      ]
    }
  },
  {
    id: 'automation-without-technology',
    topic: 'operations',
    image: '/images/journal/systems.webp',
    minutes: 5,
    published: '2026-10-20',
    en: {
      slug: 'automate-without-technology',
      title: 'Automating without technology: four paper-and-habit techniques',
      summary: 'Before writing a script or buying a tool, lean methods such as checklists, mistake-proofing, kanban and standard work can remove errors with almost no cost.',
      takeaway: 'If a step can be made impossible to skip or to do wrong, you have automated the outcome even if no software is involved.',
      sections: [
        {
          id: 'mistake-proofing',
          heading: 'Mistake-proofing (poka-yoke)',
          paragraphs: [
            'Poka-yoke, developed by Shigeo Shingo within the Toyota Production System, aims to prevent a mistake rather than catch it afterward. Low-cost versions include color-coded tools, fixtures that only accept the correct orientation and standard instructions at the point of work.',
            'Ask of every recurring error: can the wrong action be made physically or procedurally impossible?'
          ]
        },
        {
          id: 'checklists',
          heading: 'Checklists as a gate',
          paragraphs: [
            'A paper checklist can work as mistake-proofing: it fixes the order of steps and requires checks before work moves on. A published example describes a printing press start-up checklist that catches operators who forget to adjust the paper feed to the required size.',
            'Keep it short, put it where the work happens and update it whenever a new error appears.'
          ]
        },
        {
          id: 'kanban-standard',
          heading: 'Kanban and standard work',
          paragraphs: [
            'A kanban card or empty bin is a visual signal that authorizes replenishment only within agreed limits, which reduces overproduction and excess stock. Standard work records the current best method, its sequence and timing, so variation drops; it works best with an organized workplace (5S) where tools and materials are always in the same place.',
            'Synthetic example: a fictional workshop hangs a card on each supply shelf. When the shelf is half empty the card goes into a box, and the weekly purchase list is simply that box.'
          ]
        },
        {
          id: 'then-software',
          heading: 'When software enters',
          paragraphs: [
            'Once a manual rule works reliably, it becomes a clear specification for automation. Pilot a fix first, then compare effectiveness, cost and complexity before building. Often the paper version is enough; sometimes it shows exactly what a tool should do.'
          ]
        },
        {
          id: 'choose',
          heading: 'How to choose the first technique',
          paragraphs: [
            'Start with the type of error. If the problem is that a step gets skipped, a short checklist is usually the most direct fix. If the problem is doing a step the wrong way, such as using the wrong material or template, think about a physical or visual signal that prevents the mix-up, like colors or fixed locations.',
            'If what fails is quantity, because a supply runs out or piles up, a kanban-style signal helps decide when to replenish without relying on memory. And if each person does the task their own way and results vary, documenting standard work is the first step.',
            'Synthetic example: a fictional accounting office sometimes forgets to attach a receipt when emailing clients. Instead of reviewing everything at the end, it adds a fixed line to the email template that reads "receipt attached: yes / no". For a month the team records how often the omission appears and then decides whether the change is enough.',
            'Pick one technique at a time and give it enough time to show whether the result changes. Combining several at once makes it hard to know which one helped.'
          ]
        }
      ],
      discussion: [
        'Which error in your team could be made impossible instead of reviewed?',
        'Where would a four-line checklist be most useful?',
        'Which manual rule already works well enough to become a specification for software?'
      ],
      sources: [
        { title: 'UK Standards — Applying mistake/error proofing (Poka Yoke)', url: 'https://www.ukstandards.org.uk/en/nos-finder/SEMBIT321/applying-mistake-error-proofing-(poka-yoke)' },
        { title: 'Lean Manufacture — Start up checklist', url: 'https://www.leanmanufacture.net/?p=4469' }
      ]
    },
    es: {
      slug: 'automatizar-sin-tecnologia',
      title: 'Automatizar sin tecnología: cuatro técnicas de papel y hábito',
      summary: 'Antes de escribir un script o comprar una herramienta, métodos lean como listas de verificación, poka-yoke, kanban y trabajo estándar pueden eliminar errores casi sin costo.',
      takeaway: 'Si un paso se puede hacer imposible de omitir o de hacer mal, ya automatizaste el resultado aunque no haya software de por medio.',
      sections: [
        {
          id: 'mistake-proofing',
          heading: 'A prueba de errores (poka-yoke)',
          paragraphs: [
            'El poka-yoke, desarrollado por Shigeo Shingo dentro del Sistema de Producción Toyota, busca prevenir el error en lugar de detectarlo después. Las versiones de bajo costo incluyen herramientas con código de color, dispositivos que solo aceptan la orientación correcta e instrucciones estándar en el lugar de trabajo.',
            'Preguntate por cada error recurrente: ¿se puede hacer imposible la acción equivocada, física o de procedimiento?'
          ]
        },
        {
          id: 'checklists',
          heading: 'La lista de verificación como compuerta',
          paragraphs: [
            'Una lista en papel puede funcionar como prueba de errores: fija el orden de los pasos y exige comprobaciones antes de continuar. Un ejemplo publicado describe una lista de arranque de una prensa de impresión que atrapa al operario que olvida ajustar la alimentación de papel al tamaño requerido.',
            'Mantenela corta, ponela donde ocurre el trabajo y actualizala cada vez que aparezca un error nuevo.'
          ]
        },
        {
          id: 'kanban-standard',
          heading: 'Kanban y trabajo estándar',
          paragraphs: [
            'Una tarjeta kanban o un recipiente vacío es una señal visual que autoriza reponer solo dentro de límites acordados, lo que reduce la sobreproducción y el exceso de inventario. El trabajo estándar documenta el mejor método actual, con su secuencia y tiempos, para reducir la variación; funciona mejor con un lugar ordenado (5S), donde herramientas y materiales siempre están en el mismo sitio.',
            'Ejemplo sintético: un taller ficticio cuelga una tarjeta en cada estante de insumos. Cuando el estante está a la mitad, la tarjeta va a una caja, y la lista de compras semanal es simplemente esa caja.'
          ]
        },
        {
          id: 'then-software',
          heading: 'Cuándo entra el software',
          paragraphs: [
            'Cuando una regla manual funciona de forma confiable, se convierte en una especificación clara para automatizar. Probá primero la solución en pequeño y compará efectividad, costo y complejidad antes de construir. A menudo la versión en papel basta; a veces muestra exactamente qué debe hacer una herramienta.'
          ]
        },
        {
          id: 'choose',
          heading: 'Cómo elegir la primera técnica',
          paragraphs: [
            'Empezá por el tipo de error. Si el problema es que se salta un paso, una lista de verificación corta suele ser lo más directo. Si el problema es hacer un paso de forma equivocada, por ejemplo usar el material o la plantilla incorrecta, conviene pensar en una señal física o visual que impida la confusión, como colores o lugares fijos.',
            'Si lo que falla es la cantidad, porque se acaba un insumo o se acumula de más, una señal tipo kanban ayuda a decidir cuándo reponer sin depender de la memoria. Y si cada persona hace la tarea a su manera y los resultados varían, documentar el trabajo estándar es el primer paso.',
            'Ejemplo sintético: una oficina ficticia de contabilidad olvida adjuntar un comprobante en algunos envíos a clientes. En vez de revisar todo al final, agrega a la plantilla del correo una línea fija que dice "comprobante adjunto: sí / no". Durante un mes anotan cuántas veces aparece el olvido y deciden si el cambio alcanza.',
            'Elegí una sola técnica a la vez y dale tiempo suficiente para ver si cambia el resultado. Combinar varias de golpe hace difícil saber cuál ayudó.'
          ]
        }
      ],
      discussion: [
        '¿Qué error de su equipo podría hacerse imposible en lugar de revisarse?',
        '¿Dónde sería más útil una lista de cuatro líneas?',
        '¿Qué regla manual ya funciona lo suficiente como para ser la especificación de un software?'
      ],
      sources: [
        { title: 'UK Standards — Applying mistake/error proofing (Poka Yoke)', url: 'https://www.ukstandards.org.uk/en/nos-finder/SEMBIT321/applying-mistake-error-proofing-(poka-yoke)' },
        { title: 'Lean Manufacture — Start up checklist', url: 'https://www.leanmanufacture.net/?p=4469' }
      ]
    }
  }
];
