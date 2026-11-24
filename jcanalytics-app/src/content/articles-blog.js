// Blog entries. Only claims backed by the listed public sources; examples are marked as synthetic.
export const blogArticles = [
  {
    id: 'cr-continuous-improvement',
    topic: 'operations',
    image: '/projects/maison/operacion-desktop.webp',
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
    image: '/projects/soporte20/app-desktop.webp',
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
  },
  {
    id: 'cicr-excellence-program',
    topic: 'operations',
    image: '/projects/caviq/pulse-desktop.webp',
    minutes: 5,
    published: '2026-10-21',
    en: {
      slug: 'cicr-excellence-congress-what-to-expect',
      title: 'CICR Excellence Congress: what the public program says and how to use it',
      summary: 'The Cámara de Industrias announced its 2026 excellence congress for 18 November. Here is what is public so far, what the Excellence Program evaluates, and how a small team can borrow its structure.',
      takeaway: 'You do not need to attend or enter an award to benefit: the seven areas the program evaluates make a free checklist for reviewing your own operation.',
      sections: [
        {
          id: 'what-is-public',
          heading: 'What is public so far',
          paragraphs: [
            'According to public announcements, the Cámara de Industrias de Costa Rica (CICR) will hold its national business excellence congress on 18 November 2026 at the Centro de Convenciones de Costa Rica. The announced theme is about building a world-class future. Topics mentioned include leadership, innovation, sustainability, quality and artificial intelligence.',
            'The reported program includes live presentations from three finalist projects of Compromiso con la Excelencia 2026 and the awards ceremony of the Premios a la Excelencia 2026. David Hutchins, a quality and continuous improvement practitioner, is named as a main speaker, along with other invited speakers. Dates, speakers and agenda can change, so confirm them with the organizer before planning.',
            'We did not find announcements linking this congress specifically to Lean Six Sigma. It is a broader excellence event in which continuous improvement is one theme among several, so do not read it as a Lean Six Sigma conference.'
          ]
        },
        {
          id: 'seven-areas',
          heading: 'The seven areas the Excellence Program evaluates',
          paragraphs: [
            'The Programa a la Excelencia, which the CICR has run since 1997, evaluates organizations across seven areas: culture, leadership and strategy; social responsibility; human talent; environment; innovation and technology; processes; and customers and markets. The CICR also offers free information sessions about the methodology and its benefits.',
            'The list is useful even if your company never enters. Most small businesses review only sales and cash flow. Reading the seven areas side by side is a quick reminder that processes, people and customers are separate things that can each be weak while the others look fine.'
          ]
        },
        {
          id: 'training',
          heading: 'Training options that exist locally',
          paragraphs: [
            'Public course listings from the CFIA show that its technical training center, CITEC, offered a Lean Six Sigma Yellow Belt course in August and September 2026. A listing only shows that a course was offered, not its content quality or results, so ask for the syllabus and recent participant feedback before paying.',
            'For a team of five or ten people, a certification is rarely the first step. The earlier note on this blog about starting without a certification still applies: pick one repeated problem, count it, change one step and count again.'
          ]
        },
        {
          id: 'borrow',
          heading: 'How a small team can borrow the structure',
          paragraphs: [
            'Synthetic example: a fictional three-person design studio goes through the seven areas in one hour. It scores each one from 1 to 5 on a sheet of paper, honestly and without comparing against anyone. It finds that processes and customers score lowest, because every project starts with a different intake conversation and follow-up depends on memory.',
            'The studio then picks only one area, processes, and writes a one-page intake form. For a month it counts how many projects needed a second clarifying call. The same self-review can be repeated every quarter, and the scores become a simple record of where attention went.',
            'If you follow the congress after it happens, look for the finalist project presentations. Concrete before-and-after numbers from real companies are more useful than slogans, but wait for the organizer or the companies to publish them rather than relying on summaries.'
          ]
        }
      ],
      discussion: [
        'Which of the seven areas would your team score lowest today, and why?',
        'What single repeated problem could you count for a month in that area?',
        'Would a free information session or a short course help more than doing a first measurement yourself?'
      ],
      sources: [
        { title: 'La República — Excelencia empresarial será motivo de análisis en congreso de la Cámara de Industrias', url: 'https://www.larepublica.net/excelencia-empresarial-sera-motivo-de-analisis-en-congreso-de-la-camara-de-industrias/' },
        { title: 'La República — Empresas ya pueden inscribirse al Programa a la Excelencia 2026 de la CICR', url: 'https://www.larepublica.net/noticia/programa-excelencia-2026-cicr' },
        { title: 'CFIA — Capacitaciones y eventos CITEC, 2 de setiembre de 2026', url: 'https://cfia.or.cr/site/en/capacitaciones-eventos-anuncios/categoria/citec/dia/2026-09-02/' }
      ]
    },
    es: {
      slug: 'congreso-excelencia-cicr-que-esperar',
      title: 'Congreso de Excelencia de la CICR: qué dice el programa público y cómo aprovecharlo',
      summary: 'La Cámara de Industrias anunció su congreso de excelencia 2026 para el 18 de noviembre. Esto es lo público hasta ahora, qué evalúa el Programa a la Excelencia y cómo un equipo pequeño puede tomar su estructura.',
      takeaway: 'No hace falta asistir ni concursar para aprovecharlo: las siete áreas que evalúa el programa sirven como lista gratuita para revisar su propia operación.',
      sections: [
        {
          id: 'what-is-public',
          heading: 'Lo que es público hasta ahora',
          paragraphs: [
            'Según anuncios públicos, la Cámara de Industrias de Costa Rica (CICR) realizará su congreso nacional de excelencia empresarial el 18 de noviembre de 2026 en el Centro de Convenciones de Costa Rica. El lema anunciado habla de fabricar un futuro de clase mundial. Entre los temas mencionados están liderazgo, innovación, sostenibilidad, calidad e inteligencia artificial.',
            'El programa reportado incluye presentaciones en vivo de tres proyectos finalistas de Compromiso con la Excelencia 2026 y la entrega de los Premios a la Excelencia 2026. David Hutchins, practicante de calidad y mejora continua, figura como expositor principal junto con otras personas invitadas. Fechas, expositores y agenda pueden cambiar, así que confírmelos con la organización antes de planificar.',
            'No encontramos anuncios que vinculen este congreso específicamente con Lean Six Sigma. Es un evento de excelencia más amplio en el que la mejora continua es un tema entre varios, por lo que no conviene presentarlo como un congreso de Lean Six Sigma.'
          ]
        },
        {
          id: 'seven-areas',
          heading: 'Las siete áreas que evalúa el Programa a la Excelencia',
          paragraphs: [
            'El Programa a la Excelencia, que la CICR realiza desde 1997, evalúa a las organizaciones en siete áreas: cultura, liderazgo y estrategia; responsabilidad social; talento humano; ambiente; innovación y tecnología; procesos; y clientes y mercados. La CICR también ofrece sesiones informativas gratuitas sobre la metodología y sus beneficios.',
            'La lista es útil aunque su empresa nunca participe. La mayoría de los negocios pequeños revisa solo ventas y flujo de caja. Leer las siete áreas juntas recuerda que procesos, personas y clientes son cosas distintas, y que cada una puede estar débil mientras las demás se ven bien.'
          ]
        },
        {
          id: 'training',
          heading: 'Opciones de capacitación que existen en el país',
          paragraphs: [
            'Los listados públicos del CFIA muestran que su centro de capacitación técnica, CITEC, ofreció un curso de Lean Six Sigma Yellow Belt en agosto y setiembre de 2026. Un listado solo demuestra que el curso se ofreció, no la calidad de su contenido ni sus resultados, así que pida el temario y opiniones recientes de participantes antes de pagar.',
            'Para un equipo de cinco o diez personas, una certificación rara vez es el primer paso. La nota anterior de este blog sobre cómo empezar sin certificación sigue vigente: elegir un problema repetido, contarlo, cambiar un paso y contar de nuevo.'
          ]
        },
        {
          id: 'borrow',
          heading: 'Cómo un equipo pequeño puede tomar la estructura',
          paragraphs: [
            'Ejemplo sintético: un estudio de diseño ficticio de tres personas repasa las siete áreas en una hora. Califica cada una de 1 a 5 en una hoja de papel, con honestidad y sin compararse con nadie. Descubre que procesos y clientes salen más bajos, porque cada proyecto empieza con una conversación de arranque distinta y el seguimiento depende de la memoria.',
            'Entonces elige una sola área, procesos, y redacta un formulario de arranque de una página. Durante un mes cuenta cuántos proyectos necesitaron una segunda llamada para aclarar. La misma autoevaluación puede repetirse cada trimestre y las calificaciones quedan como un registro simple de dónde se puso la atención.',
            'Si da seguimiento al congreso después de que ocurra, busque las presentaciones de los proyectos finalistas. Los números concretos de antes y después de empresas reales sirven más que las consignas, pero espere a que la organización o las empresas los publiquen en lugar de apoyarse en resúmenes.'
          ]
        }
      ],
      discussion: [
        '¿Cuál de las siete áreas calificaría más bajo su equipo hoy, y por qué?',
        '¿Qué problema repetido podría contar durante un mes en esa área?',
        '¿Le ayudaría más una sesión informativa gratuita o un curso corto que hacer usted mismo una primera medición?'
      ],
      sources: [
        { title: 'La República — Excelencia empresarial será motivo de análisis en congreso de la Cámara de Industrias', url: 'https://www.larepublica.net/excelencia-empresarial-sera-motivo-de-analisis-en-congreso-de-la-camara-de-industrias/' },
        { title: 'La República — Empresas ya pueden inscribirse al Programa a la Excelencia 2026 de la CICR', url: 'https://www.larepublica.net/noticia/programa-excelencia-2026-cicr' },
        { title: 'CFIA — Capacitaciones y eventos CITEC, 2 de setiembre de 2026', url: 'https://cfia.or.cr/site/en/capacitaciones-eventos-anuncios/categoria/citec/dia/2026-09-02/' }
      ]
    }
  },
  {
    id: 'ai-agents-access-control',
    topic: 'intelligence',
    image: '/projects/transportesluna/alertas-desktop.webp',
    minutes: 5,
    published: '2026-10-22',
    en: {
      slug: 'ai-agents-need-access-rules',
      title: 'AI agents in automation: give each one the least access it needs',
      summary: 'On 6 October 2026 SailPoint announced tools to govern AI agent identities and published a survey on agents in production. What the vendor reported, and a rule any small team can apply today.',
      takeaway: 'Treat an AI agent like a new employee: a named owner, access limited to the task, and a way to switch it off.',
      sections: [
        {
          id: 'announcement',
          heading: 'What was announced',
          paragraphs: [
            'At its Navigate 2026 event on 6 October, identity-security vendor SailPoint announced a set of capabilities aimed at AI agents. Its press release describes autonomous agents that use identity context to tell legitimate agent activity from malicious activity and to right-size permissions, expanded discovery of unsanctioned ("shadow") AI, runtime authorization, and a "kill switch" for agents. It also lists just-in-time access that applies to people, service accounts and AI agents.',
            'According to the same release, some capabilities began rolling out globally at the event, while others are scheduled for the fourth quarter of SailPoint\'s fiscal 2027. These are vendor announcements about vendor products; we have not tested them and do not recommend any product here.'
          ]
        },
        {
          id: 'survey',
          heading: 'What the vendor survey reported',
          paragraphs: [
            'The same day SailPoint published its Horizons of Identity Security report. It states that 79% of the organizations surveyed run AI agents in production, while only 2% have deployed security tools built specifically for them. The survey covered 340 leaders and was run by a company that sells identity security, so read the figures as vendor-reported rather than as an independent measure of the market.',
            'Even with that caution, the direction is useful: agents are being connected to real systems faster than the rules for what they may touch.'
          ]
        },
        {
          id: 'small-team-rule',
          heading: 'A rule a small team can apply without buying anything',
          paragraphs: [
            'Synthetic example: a fictional distributor connects an AI assistant to its shared inbox to draft replies. The simple version gives it full access to every mailbox and the invoicing system. The safer version gives it read access to one mailbox, the ability to save drafts but not send them, and no access to invoicing.',
            'Before connecting any agent, write down four things: who owns it, which systems it can read, which actions it can take, and how to turn it off. If you cannot answer the last question in one step, it has too much access.',
            'Start with drafts and approvals. Let a person confirm anything that spends money, deletes data or reaches a customer, and widen the agent\'s permissions only after you have reviewed a few weeks of its work.'
          ]
        },
        {
          id: 'review',
          heading: 'Review it like any other process',
          paragraphs: [
            'Keep a short log of what the agent did and which errors a person had to correct. This is the same count-before-and-after method used in continuous improvement: if corrections fall, widen its scope a little; if they do not, narrow it or fix the instructions first.',
            'Also remove access that is no longer used. Agents set up for a pilot are easy to forget, and a forgotten connection is exactly the kind of gap the vendors above are describing.'
          ]
        }
      ],
      discussion: [
        'Which tools or accounts could an AI assistant in your team reach today?',
        'Who is the named owner of each automation, and can they switch it off immediately?',
        'Which actions should always need a person to approve them first?'
      ],
      sources: [
        { title: 'SailPoint — From Chaos to Control: SailPoint Unlocks a Secure Agentic Era with Autonomous Identity Security', url: 'https://www.sailpoint.com/press-releases/sailpoint-unlocks-a-secure-agentic-era-with-autonomous-identity-security' },
        { title: 'SailPoint — Horizons of Identity Security report: AI adoption gap', url: 'https://www.sailpoint.com/press-releases/sailpoint-horizons-identity-security-ai-adoption-gap' }
      ]
    },
    es: {
      slug: 'agentes-ia-necesitan-reglas-de-acceso',
      title: 'Agentes de IA en la automatización: a cada uno, el mínimo acceso que necesita',
      summary: 'El 6 de octubre de 2026 SailPoint anunció herramientas para gobernar las identidades de agentes de IA y publicó una encuesta sobre agentes en producción. Lo que reportó el proveedor y una regla que cualquier equipo pequeño puede aplicar hoy.',
      takeaway: 'Tratá a un agente de IA como a un empleado nuevo: un responsable con nombre, acceso limitado a la tarea y una forma de apagarlo.',
      sections: [
        {
          id: 'announcement',
          heading: 'Qué se anunció',
          paragraphs: [
            'En su evento Navigate 2026, el 6 de octubre, el proveedor de seguridad de identidades SailPoint anunció un conjunto de capacidades dirigidas a agentes de IA. Su comunicado describe agentes autónomos que usan el contexto de identidad para distinguir la actividad legítima de la maliciosa y ajustar los permisos al mínimo necesario, mayor detección de IA no autorizada ("shadow AI"), autorización en tiempo de ejecución y un "interruptor de apagado" para agentes. También menciona acceso justo a tiempo que aplica a personas, cuentas de servicio y agentes de IA.',
            'Según el mismo comunicado, algunas capacidades empezaron a desplegarse globalmente en el evento y otras están previstas para el cuarto trimestre del año fiscal 2027 de SailPoint. Son anuncios de un proveedor sobre sus propios productos; no los hemos probado ni recomendamos ningún producto aquí.'
          ]
        },
        {
          id: 'survey',
          heading: 'Lo que reportó la encuesta del proveedor',
          paragraphs: [
            'Ese mismo día SailPoint publicó su informe Horizons of Identity Security. Afirma que el 79 % de las organizaciones encuestadas ejecuta agentes de IA en producción, mientras que solo el 2 % ha implementado herramientas de seguridad diseñadas específicamente para ellos. La encuesta cubrió a 340 líderes y la realizó una empresa que vende seguridad de identidades, así que leé las cifras como reportadas por el proveedor y no como una medición independiente del mercado.',
            'Aun con esa cautela, la dirección es útil: los agentes se conectan a sistemas reales más rápido que las reglas sobre lo que pueden tocar.'
          ]
        },
        {
          id: 'small-team-rule',
          heading: 'Una regla que un equipo pequeño puede aplicar sin comprar nada',
          paragraphs: [
            'Ejemplo sintético: una distribuidora ficticia conecta un asistente de IA a su correo compartido para redactar respuestas. La versión simple le da acceso total a todos los buzones y al sistema de facturación. La versión más segura le da lectura de un solo buzón, permiso para guardar borradores pero no enviarlos, y ningún acceso a facturación.',
            'Antes de conectar cualquier agente, anotá cuatro cosas: quién es su responsable, qué sistemas puede leer, qué acciones puede ejecutar y cómo se apaga. Si no podés responder la última en un solo paso, tiene demasiado acceso.',
            'Empezá con borradores y aprobaciones. Que una persona confirme todo lo que gaste dinero, borre datos o llegue a un cliente, y ampliá los permisos del agente solo después de revisar unas semanas de su trabajo.'
          ]
        },
        {
          id: 'review',
          heading: 'Revisalo como cualquier otro proceso',
          paragraphs: [
            'Llevá un registro corto de lo que hizo el agente y de los errores que una persona tuvo que corregir. Es el mismo método de contar antes y después de la mejora continua: si las correcciones bajan, ampliá un poco su alcance; si no, reducilo o corregí primero las instrucciones.',
            'También quitá los accesos que ya no se usan. Los agentes montados para una prueba piloto se olvidan fácil, y una conexión olvidada es justo el tipo de brecha que describen los proveedores mencionados.'
          ]
        }
      ],
      discussion: [
        '¿A qué herramientas o cuentas podría llegar hoy un asistente de IA en su equipo?',
        '¿Quién es el responsable con nombre de cada automatización y puede apagarla de inmediato?',
        '¿Qué acciones deberían requerir siempre la aprobación previa de una persona?'
      ],
      sources: [
        { title: 'SailPoint — From Chaos to Control: SailPoint Unlocks a Secure Agentic Era with Autonomous Identity Security', url: 'https://www.sailpoint.com/press-releases/sailpoint-unlocks-a-secure-agentic-era-with-autonomous-identity-security' },
        { title: 'SailPoint — Horizons of Identity Security report: AI adoption gap', url: 'https://www.sailpoint.com/press-releases/sailpoint-horizons-identity-security-ai-adoption-gap' }
      ]
    }
  },
  {
    id: 'cr-manufacturing-ai-survey-2026',
    topic: 'intelligence',
    image: '/projects/caviq/reports-desktop.webp',
    minutes: 5,
    published: '2026-11-11',
    en: {
      slug: 'ai-in-costa-rican-manufacturing-2026',
      title: 'AI in Costa Rican manufacturing: what the 2026 CICR survey found',
      summary: 'Half of the manufacturers surveyed by the Cámara de Industrias already use some AI, mostly in administration and sales. The gap is skills, not access.',
      takeaway: 'The first useful AI in a company tends to sit in back-office processes. Start there, with a process that is already written down, and train the people who run it.',
      sections: [
        {
          id: 'figures',
          heading: 'What the survey reports',
          paragraphs: [
            'The Cámara de Industrias de Costa Rica (CICR) added a module on artificial intelligence to its annual survey "Perspectivas Empresariales y Valoración de Factores de Competitividad de la Industria Manufacturera, 2026". According to the chamber, 115 companies from the formal industrial sector answered between 9 April and 15 July 2026.',
            '53 % of the companies said they currently use some AI system or software, and 47 % said they do not. Use is higher in free trade zones (71.4 %) than in the definitive regime (47.1 %). Within the definitive regime, 38.9 % of SMEs use AI, compared with 60.6 % of large companies.'
          ]
        },
        {
          id: 'where',
          heading: 'Where it is used: offices before the plant floor',
          paragraphs: [
            'Among the companies that use AI, the most common uses are organizing administrative or business management processes (54.1 %) and marketing or sales (52.5 %). The CICR links this to another result: 95.1 % of the companies that use AI say their number of workers did not change after adopting it. Because AI is concentrated in administrative and commercial areas, not on the production line, it has not yet changed staffing on the plant floor.',
            'This is a survey of one sector and reflects what companies say about themselves. It does not measure productivity gains, and it does not say which tools are used or how well.'
          ]
        },
        {
          id: 'barrier',
          heading: 'The main barrier is knowledge',
          paragraphs: [
            'Among companies that do not use AI yet, the main barrier reported is the lack of specialized knowledge inside the organization. That matches what we see in smaller teams: the tool is rarely the hard part. The hard part is knowing which step of a process to hand over, how to check the result and who is responsible when it is wrong.',
            'For SMEs, the 38.9 % figure is a reminder that the gap with large companies is real. It is also an opportunity: the most common uses in the survey, administration and sales, are exactly the processes a small company can map in an afternoon.'
          ]
        },
        {
          id: 'start',
          heading: 'A practical starting point',
          paragraphs: [
            'Synthetic example: a fictional packaging workshop spends several hours a week copying purchase orders from email into a spreadsheet. Before trying any AI tool, the team writes the five steps on one page, agrees on which fields are mandatory and counts how many orders need correction. Only then does it test an assistant on the copying step, with a person reviewing every order for the first month.',
            'The sequence matters more than the tool: write the process down, measure it, automate one step, keep a human check and measure again. It is the same continuous improvement loop the CICR promotes in its Lean and excellence programs, now applied to AI.'
          ]
        }
      ],
      discussion: [
        'Which administrative process in your company is repeated every week and already follows clear steps?',
        'Who on your team would need training before you could trust an AI tool with one of those steps?',
        'How would you measure whether the result improved after the change?'
      ],
      sources: [
        { title: 'CICR — Uso de la Inteligencia Artificial gana terreno en la industria manufacturera, pero persisten brechas en su adopción', url: 'https://cicr.com/cicr-uso-de-la-inteligencia-artificial-gana-terreno-en-la-industria-manufacturera-pero-persisten-brechas-en-su-adopcion/' },
        { title: 'Revista Summa — Costa Rica: Uso de la IA gana terreno en la industria manufacturera, pero persisten brechas', url: 'https://revistasumma.com/costa-rica-uso-de-la-ia-gana-terreno-en-la-industria-manufacturera-pero-persisten-brechas/' }
      ]
    },
    es: {
      slug: 'ia-en-la-manufactura-costarricense-2026',
      title: 'IA en la manufactura costarricense: lo que encontró la encuesta 2026 de la CICR',
      summary: 'La mitad de las industrias consultadas por la Cámara de Industrias ya usa alguna IA, sobre todo en administración y ventas. La brecha está en el conocimiento, no en el acceso.',
      takeaway: 'La primera IA útil en una empresa suele estar en los procesos de oficina. Empezá ahí, con un proceso que ya esté escrito, y capacitá a quienes lo ejecutan.',
      sections: [
        {
          id: 'figures',
          heading: 'Lo que reporta la encuesta',
          paragraphs: [
            'La Cámara de Industrias de Costa Rica (CICR) agregó un módulo sobre inteligencia artificial a su encuesta anual "Perspectivas Empresariales y Valoración de Factores de Competitividad de la Industria Manufacturera, 2026". Según la cámara, respondieron 115 empresas del sector industrial formal entre el 9 de abril y el 15 de julio de 2026.',
            'El 53 % de las empresas indicó que usa actualmente algún sistema o software de IA y el 47 % que todavía no. El uso es mayor en zona franca (71,4 %) que en el régimen definitivo (47,1 %). Dentro del régimen definitivo, el 38,9 % de las pymes usa IA, frente al 60,6 % de las empresas grandes.'
          ]
        },
        {
          id: 'where',
          heading: 'Dónde se usa: primero la oficina, después la planta',
          paragraphs: [
            'Entre las empresas que usan IA, los usos más extendidos son la organización de procesos de administración o gestión empresarial (54,1 %) y marketing o ventas (52,5 %). La CICR relaciona esto con otro resultado: el 95,1 % de las empresas que usan IA dice que la cantidad de trabajadores no cambió tras incorporarla. Como la IA se concentra en áreas administrativas y comerciales, y no en la línea de producción, todavía no ha cambiado la planilla en planta.',
            'Es una encuesta de un solo sector y refleja lo que las empresas dicen de sí mismas. No mide ganancias de productividad ni dice qué herramientas se usan ni qué tan bien.'
          ]
        },
        {
          id: 'barrier',
          heading: 'La principal barrera es el conocimiento',
          paragraphs: [
            'Entre las empresas que aún no usan IA, la principal barrera reportada es la falta de conocimientos especializados dentro de la organización. Coincide con lo que vemos en equipos pequeños: la herramienta casi nunca es lo difícil. Lo difícil es saber qué paso del proceso delegar, cómo revisar el resultado y quién responde cuando sale mal.',
            'Para las pymes, el 38,9 % recuerda que la brecha con las grandes es real. También es una oportunidad: los usos más comunes de la encuesta, administración y ventas, son justo los procesos que una empresa pequeña puede mapear en una tarde.'
          ]
        },
        {
          id: 'start',
          heading: 'Un punto de partida práctico',
          paragraphs: [
            'Ejemplo sintético: un taller ficticio de empaques dedica varias horas por semana a copiar órdenes de compra del correo a una hoja de cálculo. Antes de probar cualquier herramienta de IA, el equipo escribe los cinco pasos en una página, acuerda qué campos son obligatorios y cuenta cuántas órdenes necesitan corrección. Solo entonces prueba un asistente en el paso de copiado, con una persona revisando cada orden durante el primer mes.',
            'El orden importa más que la herramienta: escribir el proceso, medirlo, automatizar un paso, mantener una revisión humana y volver a medir. Es el mismo ciclo de mejora continua que la CICR promueve en sus programas Lean y de excelencia, ahora aplicado a la IA.'
          ]
        }
      ],
      discussion: [
        '¿Qué proceso administrativo de su empresa se repite cada semana y ya sigue pasos claros?',
        '¿Quién de su equipo necesitaría capacitación antes de confiarle uno de esos pasos a una herramienta de IA?',
        '¿Cómo medirían si el resultado mejoró después del cambio?'
      ],
      sources: [
        { title: 'CICR — Uso de la Inteligencia Artificial gana terreno en la industria manufacturera, pero persisten brechas en su adopción', url: 'https://cicr.com/cicr-uso-de-la-inteligencia-artificial-gana-terreno-en-la-industria-manufacturera-pero-persisten-brechas-en-su-adopcion/' },
        { title: 'Revista Summa — Costa Rica: Uso de la IA gana terreno en la industria manufacturera, pero persisten brechas', url: 'https://revistasumma.com/costa-rica-uso-de-la-ia-gana-terreno-en-la-industria-manufacturera-pero-persisten-brechas/' }
      ]
    }
  },
  {
    id: 'jidoka-andon-office',
    topic: 'operations',
    image: '/projects/crimson/levantamientos-desktop.webp',
    minutes: 5,
    published: '2026-11-12',
    en: {
      slug: 'jidoka-andon-stop-when-something-fails',
      title: 'Jidoka and andon: automating means knowing when to stop',
      summary: 'Toyota calls it automation with a human touch: the process stops itself when something is abnormal and calls for help. The idea works in an office with paper, and it is also the right rule for AI agents.',
      takeaway: 'A good automation, with or without technology, does not just run faster. It detects when something is wrong, stops before passing the defect on and makes the problem visible to someone who can fix it.',
      sections: [
        {
          id: 'origin',
          heading: 'Where the idea comes from',
          paragraphs: [
            'Jidoka is one of the two pillars of the Toyota Production System, together with just-in-time. Toyota describes it as stopping a machine automatically when an abnormality occurs, so that defective products are not made and a person does not have to watch each machine all the time. The Lean Enterprise Institute notes that Toyota\'s own material translates it as "automation with a human touch".',
            'The origin is a loom. Sakichi Toyoda built looms that stopped by themselves when a thread broke or ran out, instead of continuing to weave defective cloth. One person could then look after several machines, because the machine itself signaled when it needed attention.'
          ]
        },
        {
          id: 'andon',
          heading: 'Andon: making the problem visible',
          paragraphs: [
            'Andon is the signal that goes with jidoka. On a Toyota line, a worker who finds a problem pulls a cord or presses a button, a board lights up and a team leader comes to help. According to the Lean Enterprise Institute, any worker can stop the process when they face a problem they cannot solve within a preset time. The line does not always stop at once: it continues to a fixed position, and the team leader decides whether it stops.',
            'Two things matter here. Stopping is not a punishment, it is how the process asks for help. And the decision to stop belongs to the person closest to the work, not to a report at the end of the month.'
          ]
        },
        {
          id: 'office',
          heading: 'Jidoka without technology in an office',
          paragraphs: [
            'You do not need sensors to apply the idea. You need three things written down: what counts as abnormal, where the work stops and who is called. A red card on the desk, a column called "stopped" on a paper board or a rule that says "do not send the invoice if the order number is missing" are all forms of jidoka.',
            'Synthetic example: a fictional distribution office often dispatches orders with incomplete addresses that come back days later. The team agrees on one rule: if the address lacks a district or a reference, the order goes to a red tray and is not packed. Twice a day the coordinator empties the tray and calls the customer. In the first weeks the tray fills up, which is uncomfortable but useful: it shows where the incomplete data comes from, and that is the problem to fix next.',
            'The tray is not the goal. Each stop should lead to a question about the cause, otherwise the team only gets used to a full tray.'
          ]
        },
        {
          id: 'ai',
          heading: 'The same rule for AI and software',
          paragraphs: [
            'Software automation and AI agents fail differently from people: they can repeat the same mistake hundreds of times without getting tired. That is why jidoka is a good design rule for them. Before automating a step, define which conditions should stop it, for example a missing field, an amount above a limit or a low-confidence answer, and send those cases to a person instead of letting the flow continue.',
            'If the manual version of the rule already works with a red tray, you have a clear specification for the software: the same conditions, the same stop and the same person who gets the alert. Automating without that rule is how a small error turns into a large one.'
          ]
        }
      ],
      discussion: [
        'Which defect in your process is usually discovered only at the end, when it is expensive to fix?',
        'What would be your "red tray": the place where work waits when something is abnormal?',
        'If you automated a step tomorrow, which conditions should make it stop and call a person?'
      ],
      sources: [
        { title: 'Toyota — Toyota Production System', url: 'https://global.toyota/en/company/vision-and-philosophy/production-system/' },
        { title: 'Toyota — Virtual plant tour: Toyota Production System', url: 'https://global.toyota/en/company/plant-tours/production-system/' },
        { title: 'Lean Enterprise Institute — Toyota Production System (lexicon)', url: 'https://www.lean.org/lexicon-terms/toyota-production-system/' },
        { title: 'Lean Enterprise Institute — Lean Roundup: Jidoka', url: 'https://www.lean.org/the-lean-post/articles/lean-roundup-jidoka/' }
      ]
    },
    es: {
      slug: 'jidoka-andon-detenerse-cuando-algo-falla',
      title: 'Jidoka y andon: automatizar también es saber cuándo detenerse',
      summary: 'Toyota lo llama automatización con toque humano: el proceso se detiene solo cuando algo es anormal y pide ayuda. La idea funciona en una oficina con papel, y también es la regla correcta para los agentes de IA.',
      takeaway: 'Una buena automatización, con o sin tecnología, no solo va más rápido. Detecta cuando algo está mal, se detiene antes de pasar el defecto y hace visible el problema para alguien que pueda resolverlo.',
      sections: [
        {
          id: 'origin',
          heading: 'De dónde viene la idea',
          paragraphs: [
            'El jidoka es uno de los dos pilares del Sistema de Producción Toyota, junto con el justo a tiempo. Toyota lo describe como detener una máquina de forma automática cuando ocurre una anormalidad, para no fabricar productos defectuosos y para que una persona no tenga que vigilar cada máquina todo el tiempo. El Lean Enterprise Institute señala que el propio material de Toyota lo traduce como "automatización con toque humano".',
            'El origen es un telar. Sakichi Toyoda construyó telares que se detenían solos cuando un hilo se rompía o se acababa, en lugar de seguir tejiendo tela defectuosa. Así una persona podía atender varias máquinas, porque la máquina misma avisaba cuándo necesitaba atención.'
          ]
        },
        {
          id: 'andon',
          heading: 'Andon: hacer visible el problema',
          paragraphs: [
            'El andon es la señal que acompaña al jidoka. En una línea de Toyota, quien encuentra un problema jala una cuerda o presiona un botón, se enciende un tablero y llega un líder de equipo a ayudar. Según el Lean Enterprise Institute, cualquier trabajador puede detener el proceso cuando enfrenta un problema que no logra resolver en un tiempo preestablecido. La línea no siempre se detiene de inmediato: avanza hasta una posición fija y el líder de equipo decide si se para.',
            'Aquí importan dos cosas. Detenerse no es un castigo, es la forma en que el proceso pide ayuda. Y la decisión de parar le corresponde a la persona más cercana al trabajo, no a un informe a fin de mes.'
          ]
        },
        {
          id: 'office',
          heading: 'Jidoka sin tecnología en una oficina',
          paragraphs: [
            'No hacen falta sensores para aplicar la idea. Hacen falta tres cosas por escrito: qué se considera anormal, dónde se detiene el trabajo y a quién se llama. Una tarjeta roja en el escritorio, una columna "detenido" en un tablero de papel o una regla que dice "no se envía la factura si falta el número de orden" son formas de jidoka.',
            'Ejemplo sintético: una oficina ficticia de distribución despacha con frecuencia pedidos con direcciones incompletas que vuelven días después. El equipo acuerda una sola regla: si la dirección no tiene distrito o una seña, el pedido va a una bandeja roja y no se empaca. Dos veces al día la coordinadora vacía la bandeja y llama al cliente. Las primeras semanas la bandeja se llena, lo cual es incómodo pero útil: muestra de dónde vienen los datos incompletos, y ese es el siguiente problema a resolver.',
            'La bandeja no es la meta. Cada detención debe llevar a una pregunta sobre la causa; si no, el equipo solo se acostumbra a una bandeja llena.'
          ]
        },
        {
          id: 'ai',
          heading: 'La misma regla para la IA y el software',
          paragraphs: [
            'La automatización con software y los agentes de IA fallan distinto que las personas: pueden repetir el mismo error cientos de veces sin cansarse. Por eso el jidoka es una buena regla de diseño para ellos. Antes de automatizar un paso, definí qué condiciones deben detenerlo, por ejemplo un campo vacío, un monto mayor a un límite o una respuesta con poca confianza, y enviá esos casos a una persona en lugar de dejar que el flujo continúe.',
            'Si la versión manual de la regla ya funciona con una bandeja roja, tenés una especificación clara para el software: las mismas condiciones, la misma detención y la misma persona que recibe el aviso. Automatizar sin esa regla es la forma en que un error pequeño se vuelve grande.'
          ]
        }
      ],
      discussion: [
        '¿Qué defecto de su proceso se descubre casi siempre al final, cuando ya es caro corregirlo?',
        '¿Cuál sería su "bandeja roja": el lugar donde espera el trabajo cuando algo es anormal?',
        'Si mañana automatizaran un paso, ¿qué condiciones deberían detenerlo y llamar a una persona?'
      ],
      sources: [
        { title: 'Toyota — Toyota Production System', url: 'https://global.toyota/en/company/vision-and-philosophy/production-system/' },
        { title: 'Toyota — Virtual plant tour: Toyota Production System', url: 'https://global.toyota/en/company/plant-tours/production-system/' },
        { title: 'Lean Enterprise Institute — Toyota Production System (lexicon)', url: 'https://www.lean.org/lexicon-terms/toyota-production-system/' },
        { title: 'Lean Enterprise Institute — Lean Roundup: Jidoka', url: 'https://www.lean.org/the-lean-post/articles/lean-roundup-jidoka/' }
      ]
    }
  },
  {
    id: 'world-bank-ai-transition-lac-2026',
    topic: 'intelligence',
    image: '/projects/caviq/technology-desktop.webp',
    minutes: 5,
    published: '2026-11-13',
    en: {
      slug: 'world-bank-ai-adoption-is-about-processes',
      title: 'The World Bank on AI in Latin America: the barrier is not the price, it is the process',
      summary: 'The World Bank\'s October 2026 regional update is about AI. Its message for companies is uncomfortable and useful: firms already use AI, but rarely in their core processes, and what holds them back is know-how and organization more than the cost of the tools.',
      takeaway: 'Buying an AI tool is the easy part. The value appears when a company knows which process it wants to change, has its data in order and reorganizes the work around it.',
      sections: [
        {
          id: 'report',
          heading: 'What was published',
          paragraphs: [
            'On October 6, 2026, the World Bank published its Latin America and the Caribbean Economic Update, titled "Harnessing the AI Transition" (in Spanish, "Aprovechando la transición de la IA"). It projects regional growth of 2.2 % for 2026 and devotes its analysis to how AI could become a new source of productivity.',
            'According to the press release, a median of 17 % of working-age adults in the region say they use generative AI tools, about half the rate seen in the United States and Canada. The release also states that firms are already adopting AI widely, but rarely integrate it into the core activities of their business processes.'
          ]
        },
        {
          id: 'barriers',
          heading: 'The barriers are inside the company',
          paragraphs: [
            'A World Bank blog post on the regional updates sums up the obstacles in Latin America as weak managerial know-how, organizational capital and data capabilities. In other words, the limit is not access to the tool but knowing how to use it and having the information it needs.',
            'The same post points out that more than four in ten digitally connected workers cannot write a prompt that an AI system can usefully act on. Among the policy ideas it mentions are technology extension services for smaller firms and the state acting as an anchor client through agile public procurement.'
          ]
        },
        {
          id: 'costa-rica',
          heading: 'And Costa Rica?',
          paragraphs: [
            'According to El Financiero\'s coverage of the report, Costa Rica shows relatively favorable conditions to adopt AI, but faces barriers to integrate it into companies, and digital infrastructure is its largest gap against its comparison group. The same outlet notes that Costa Rica and Colombia show individual adoption of generative AI above what their income level would predict. We could not open the full report from our environment, so these country details come from the press coverage.',
            'This fits what local surveys already showed. The Costa Rican Chamber of Industries reported in 2026 that 53 % of the manufacturing companies it consulted use AI, mostly in administration and marketing. That survey was answered by affiliated companies and is not a probability sample, so it describes those firms, not the whole sector.'
          ]
        },
        {
          id: 'practice',
          heading: 'What it means for an SME',
          paragraphs: [
            'If the bottleneck is organization, the first step is not a license. It is choosing one process that matters to the business, drawing it as it really works today, and measuring how long it takes and how often it fails. With that map, it becomes clear whether AI helps, whether a simple rule or form is enough, or whether the data must be cleaned first.',
            'The report also highlights "small AI": low-cost applications adapted to local needs, which already show promising results in education, telemedicine and public services. For a small company that is the right scale: one well-defined task, with a person reviewing the result and a clear measure of whether it improved.'
          ]
        }
      ],
      discussion: [
        'In which process does your team use AI today: a side task or a core part of the business?',
        'Do you have that process drawn and measured, or does it live in the heads of two or three people?',
        'Which "small AI" task could you test this month with a person reviewing every result?'
      ],
      sources: [
        { title: 'World Bank — Latin America and the Caribbean Holds Steady While Top Performers Show a Path to Higher Growth (press release, Oct 6, 2026)', url: 'https://www.worldbank.org/en/news/press-release/2026/10/06/latin-america-caribbean-economic-update' },
        { title: 'World Bank — Latin America & the Caribbean Economic Update: Harnessing the AI Transition (PDF)', url: 'https://documents1.worldbank.org/curated/en/099100526213586183/pdf/P516409-efd581da-b8cd-4b2c-a393-00b61ed67105.pdf' },
        { title: 'World Bank Blogs — The AI wave is global. Readiness is not.', url: 'https://blogs.worldbank.org/en/developmenttalk/the-ai-wave-is-global--readiness-is-not--here-s-what-the-latest-' },
        { title: 'El Financiero — Todo lo que dijo el Banco Mundial sobre la IA', url: 'https://www.elfinancierocr.com/economia-y-politica/todo-lo-que-dijo-el-banco-mundial-sobre-la/THJI2GRDLBEJTCOPOOPAOG4OOA/story/' }
      ]
    },
    es: {
      slug: 'banco-mundial-ia-adopcion-es-cuestion-de-procesos',
      title: 'El Banco Mundial y la IA en América Latina: la barrera no es el precio, es el proceso',
      summary: 'El informe regional de octubre 2026 del Banco Mundial trata sobre IA. Su mensaje para las empresas es incómodo y útil: las firmas ya usan IA, pero casi nunca en sus procesos centrales, y lo que las frena es el conocimiento y la organización más que el costo de las herramientas.',
      takeaway: 'Comprar una herramienta de IA es la parte fácil. El valor aparece cuando la empresa sabe qué proceso quiere cambiar, tiene sus datos en orden y reorganiza el trabajo alrededor de eso.',
      sections: [
        {
          id: 'report',
          heading: 'Qué se publicó',
          paragraphs: [
            'El 6 de octubre de 2026 el Banco Mundial publicó su Panorama económico de América Latina y el Caribe, titulado "Aprovechando la transición de la IA". Proyecta un crecimiento regional de 2,2 % para 2026 y dedica su análisis a cómo la IA podría convertirse en una nueva fuente de productividad.',
            'Según el comunicado de prensa, una mediana del 17 % de los adultos en edad de trabajar de la región dice usar herramientas de IA generativa, cerca de la mitad de la tasa de Estados Unidos y Canadá. El comunicado también afirma que las empresas ya adoptan ampliamente la IA, aunque rara vez la integran en las actividades centrales de sus procesos de negocio.'
          ]
        },
        {
          id: 'barriers',
          heading: 'Las barreras están dentro de la empresa',
          paragraphs: [
            'Una entrada del blog del Banco Mundial sobre los informes regionales resume los obstáculos en América Latina como poco conocimiento gerencial, poco capital organizacional y pocas capacidades de datos. Es decir, el límite no es el acceso a la herramienta, sino saber usarla y tener la información que necesita.',
            'La misma entrada señala que más de cuatro de cada diez trabajadores conectados no logran escribir una instrucción con la que un sistema de IA pueda trabajar de forma útil. Entre las ideas de política que menciona están los servicios de extensión tecnológica para empresas pequeñas y el Estado como cliente ancla mediante compras públicas ágiles.'
          ]
        },
        {
          id: 'costa-rica',
          heading: '¿Y Costa Rica?',
          paragraphs: [
            'Según la cobertura de El Financiero, el informe ubica a Costa Rica con condiciones relativamente favorables para adoptar IA, pero con barreras para integrarla en las empresas, y la infraestructura digital es su mayor distancia frente a su grupo de referencia. El mismo medio indica que Costa Rica y Colombia muestran un uso individual de IA generativa mayor al que predice su nivel de ingreso. No pudimos abrir el informe completo desde nuestro entorno, así que estos datos del país vienen de la prensa.',
            'Esto coincide con lo que ya mostraban las encuestas locales. La Cámara de Industrias de Costa Rica reportó en 2026 que el 53 % de las empresas manufactureras consultadas usa IA, sobre todo en gestión administrativa y mercadeo. Esa encuesta la respondieron empresas afiliadas y no es una muestra probabilística, así que describe a esas firmas y no a todo el sector.'
          ]
        },
        {
          id: 'practice',
          heading: 'Qué significa para una pyme',
          paragraphs: [
            'Si el cuello de botella es la organización, el primer paso no es una licencia. Es elegir un proceso que importe al negocio, dibujarlo como funciona hoy de verdad y medir cuánto tarda y cada cuánto falla. Con ese mapa se ve si la IA ayuda, si basta una regla o un formulario sencillo, o si primero hay que limpiar los datos.',
            'El informe también destaca la "IA a pequeña escala": aplicaciones de bajo costo adaptadas a necesidades locales, que ya muestran resultados prometedores en educación, telemedicina y servicios públicos. Para una empresa pequeña esa es la escala correcta: una tarea bien definida, con una persona que revisa el resultado y una medida clara de si mejoró.'
          ]
        }
      ],
      discussion: [
        '¿En qué proceso usa hoy su equipo la IA: una tarea lateral o una parte central del negocio?',
        '¿Tienen ese proceso dibujado y medido, o vive en la cabeza de dos o tres personas?',
        '¿Qué tarea de "IA a pequeña escala" podrían probar este mes con una persona revisando cada resultado?'
      ],
      sources: [
        { title: 'Banco Mundial — América Latina y el Caribe se mantiene estable mientras las economías con mejor desempeño marcan el camino hacia un mayor crecimiento (comunicado, 6 oct 2026)', url: 'https://www.bancomundial.org/es/news/press-release/2026/10/06/latin-america-caribbean-economic-update' },
        { title: 'Banco Mundial — Panorama económico de América Latina y el Caribe: Aprovechando la transición de la IA (PDF)', url: 'https://documents1.worldbank.org/curated/en/099100526213531870/pdf/P516409-0a0e0187-a3c9-4e09-aad6-541490db4d3f.pdf' },
        { title: 'Blogs del Banco Mundial — The AI wave is global. Readiness is not.', url: 'https://blogs.worldbank.org/en/developmenttalk/the-ai-wave-is-global--readiness-is-not--here-s-what-the-latest-' },
        { title: 'El Financiero — Todo lo que dijo el Banco Mundial sobre la IA', url: 'https://www.elfinancierocr.com/economia-y-politica/todo-lo-que-dijo-el-banco-mundial-sobre-la/THJI2GRDLBEJTCOPOOPAOG4OOA/story/' }
      ]
    }
  },
  {
    id: 'ai-agents-long-tasks-nov-2026',
    topic: 'intelligence',
    image: '/projects/caviq/pulse-desktop.webp',
    minutes: 5,
    published: '2026-11-14',
    en: {
      slug: 'ai-agents-work-for-days-half-the-workflows',
      title: 'AI in November 2026: agents that work for days, and still finish only half the workflows',
      summary: 'Two official announcements from this week show where AI for process automation stands: models that coordinate hundreds of agents for days, and platforms sold with thousands of prebuilt agents. The vendor\'s own numbers also show why a person still has to review the result.',
      takeaway: 'The models improved a lot in long, multi-step work. On a business workflow benchmark, the best published score is still about half. Plan your automation for the half that fails.',
      sections: [
        {
          id: 'announced',
          heading: 'What was announced',
          paragraphs: [
            'On November 9, 2026, Anthropic published Claude Fable 5.2 and Claude Mythos 5.2. According to the announcement, they produce output up to 30 % faster than the previous versions and cost USD 8 per million input tokens and USD 40 per million output tokens. Both are the same model with different safeguards: Fable is available to everyone, and Mythos is limited to vetted organizations.',
            'On November 10, IBM and Microsoft announced Imagine Enterprise, a platform to build, run and govern AI agents. According to the joint press release, IBM Consulting contributes more than 6,000 prebuilt agents and assets, Microsoft provides the technology base, and the first industries are financial services, insurance and retail. We could not open the release from our environment, so these points come from the indexed text of the official IBM and Microsoft pages.'
          ]
        },
        {
          id: 'long-work',
          heading: 'What changed: long work with many agents',
          paragraphs: [
            'The examples in Anthropic\'s announcement are not about answering a question. One describes an engineer who had the model design a prototype operating system, coordinating more than 1,000 subagents over eight days. A companion research post describes the model designing three electronic devices, with circuit boards that a manufacturer built directly from its files.',
            'The same post is clear about the limits. People assembled and tested the boards, the model had no connection to test equipment, and the three devices are prototypes that have not gone through electrical validation, thermal testing or certification. That is a useful pattern for any company: the model does the long design work, and people keep the physical checks and the final approval.'
          ]
        },
        {
          id: 'half',
          heading: 'The number that matters for processes',
          paragraphs: [
            'Among the results Anthropic reports is AutomationBench, which it describes as a test of business workflows. The new model scores 51.4 %, against 42.5 % for Claude Opus 5.5, the model the company recommends for daily work. That is a real improvement, and it also means that about half of the workflows in that test are not completed correctly.',
            'These are figures reported by the vendor, not an independent audit, and a benchmark is not your process. Still, the order of magnitude is a good guide. If you automate an administrative flow with an agent today, expect a meaningful share of cases to need a person. Anthropic itself reserves the largest models for the hardest tasks.'
          ]
        },
        {
          id: 'sme',
          heading: 'What a small company can do with this',
          paragraphs: [
            'A catalog of 6,000 agents does not solve the first question, which is which process you want to change and how you will know it improved. Start with one flow that has clear inputs and a clear definition of "done", such as classifying incoming requests or preparing a draft quote.',
            'Then write the stop rules before turning the agent on: which cases go to a person, who that person is and how long they have to answer. Measure for a few weeks how many cases the agent finishes without correction. If that share is low, the problem is often in the data or in a step nobody documented, not in the model.',
            'Synthetic example: a fictional accounting office tests an agent that reads supplier invoices and proposes the accounting entry. The rule is that any invoice without a purchase order, or above a set amount, goes to a person. After a month they count how many proposals were accepted without changes, and only then decide whether to extend the test to another type of document.'
          ]
        }
      ],
      discussion: [
        'In which of your processes could an error rate of one in two be acceptable with human review, and in which could it not?',
        'Who in your team would review the cases the agent cannot finish, and how much time would that take?',
        'What would you measure in the first month to decide whether the automation stays?'
      ],
      sources: [
        { title: 'Anthropic — Introducing Claude Fable 5.2 and Claude Mythos 5.2 (Nov 9, 2026)', url: 'https://www.anthropic.com/claude-fable-and-mythos-5-2' },
        { title: 'Anthropic — Claude can design electronic prototypes from start to finish (Nov 9, 2026)', url: 'https://www.anthropic.com/research/claude-electronics-design' },
        { title: 'IBM Newsroom — IBM and Microsoft Announce a New AI Agent Platform Designed for Industry-Specific Transformation (Nov 10, 2026)', url: 'https://newsroom.ibm.com/2026-11-10-ibm-and-microsoft-announce-a-new-ai-agent-platform-designed-for-industry-specific-transformation' },
        { title: 'Microsoft Source — IBM and Microsoft announce a new AI agent platform designed for industry-specific transformation', url: 'https://news.microsoft.com/source/2026/11/10/ibm-and-microsoft-announce-a-new-ai-agent-platform-designed-for-industry-specific-transformation/' }
      ]
    },
    es: {
      slug: 'agentes-ia-trabajan-dias-la-mitad-de-los-flujos',
      title: 'IA en noviembre 2026: agentes que trabajan días enteros y aún completan solo la mitad de los flujos',
      summary: 'Dos anuncios oficiales de esta semana muestran en qué punto está la IA para automatizar procesos: modelos que coordinan cientos de agentes durante días y plataformas que se venden con miles de agentes prediseñados. Las cifras del propio proveedor también explican por qué una persona todavía debe revisar el resultado.',
      takeaway: 'Los modelos mejoraron mucho en trabajo largo y de varios pasos. En una prueba de flujos de negocio, la mejor nota publicada sigue cerca de la mitad. Diseñe su automatización pensando en la mitad que falla.',
      sections: [
        {
          id: 'announced',
          heading: 'Qué se anunció',
          paragraphs: [
            'El 9 de noviembre de 2026 Anthropic publicó Claude Fable 5.2 y Claude Mythos 5.2. Según el anuncio, generan resultados hasta un 30 % más rápido que las versiones anteriores y cuestan USD 8 por millón de tokens de entrada y USD 40 por millón de tokens de salida. Los dos son el mismo modelo con salvaguardas distintas: Fable está disponible para todo el público y Mythos se limita a organizaciones verificadas.',
            'El 10 de noviembre IBM y Microsoft anunciaron Imagine Enterprise, una plataforma para construir, operar y gobernar agentes de IA. Según el comunicado conjunto, IBM Consulting aporta más de 6.000 agentes y activos prediseñados, Microsoft pone la base tecnológica y las primeras industrias son servicios financieros, seguros y comercio minorista. No pudimos abrir el comunicado desde nuestro entorno, así que estos puntos vienen del texto indexado de las páginas oficiales de IBM y Microsoft.'
          ]
        },
        {
          id: 'long-work',
          heading: 'Qué cambió: trabajo largo con muchos agentes',
          paragraphs: [
            'Los ejemplos del anuncio de Anthropic no tratan de responder una pregunta. Uno describe a un ingeniero que puso al modelo a diseñar un prototipo de sistema operativo, coordinando más de 1.000 subagentes durante ocho días. Una publicación de investigación que lo acompaña describe cómo el modelo diseñó tres dispositivos electrónicos, con tarjetas de circuito que un fabricante construyó directamente a partir de sus archivos.',
            'La misma publicación es clara con los límites. Las tarjetas las ensamblaron y probaron personas, el modelo no tenía conexión con equipos de prueba, y los tres dispositivos son prototipos que no han pasado por validación eléctrica, pruebas térmicas ni certificación. Es un patrón útil para cualquier empresa: el modelo hace el trabajo largo de diseño y las personas conservan las pruebas físicas y la aprobación final.'
          ]
        },
        {
          id: 'half',
          heading: 'La cifra que importa para los procesos',
          paragraphs: [
            'Entre los resultados que reporta Anthropic está AutomationBench, que la empresa describe como una prueba de flujos de trabajo de negocio. El modelo nuevo obtiene 51,4 %, frente a 42,5 % de Claude Opus 5.5, el modelo que la empresa recomienda para el trabajo diario. Es una mejora real, y también significa que cerca de la mitad de los flujos de esa prueba no se completan bien.',
            'Son cifras reportadas por el proveedor, no una auditoría independiente, y una prueba no es su proceso. Aun así, el orden de magnitud sirve de guía. Si hoy automatiza un flujo administrativo con un agente, espere que una parte importante de los casos necesite a una persona. La propia Anthropic reserva los modelos más grandes para las tareas más difíciles.'
          ]
        },
        {
          id: 'sme',
          heading: 'Qué puede hacer una empresa pequeña con esto',
          paragraphs: [
            'Un catálogo de 6.000 agentes no resuelve la primera pregunta, que es cuál proceso quiere cambiar y cómo va a saber que mejoró. Empiece con un flujo que tenga entradas claras y una definición clara de "terminado", como clasificar solicitudes entrantes o preparar el borrador de una cotización.',
            'Después escriba las reglas de detención antes de encender el agente: qué casos pasan a una persona, quién es esa persona y cuánto tiempo tiene para responder. Mida durante unas semanas cuántos casos termina el agente sin corrección. Si esa proporción es baja, el problema suele estar en los datos o en un paso que nadie documentó, no en el modelo.',
            'Ejemplo sintético: una oficina contable ficticia prueba un agente que lee facturas de proveedores y propone el asiento contable. La regla es que toda factura sin orden de compra, o por encima de un monto definido, pasa a una persona. Al mes cuentan cuántas propuestas se aceptaron sin cambios, y solo entonces deciden si amplían la prueba a otro tipo de documento.'
          ]
        }
      ],
      discussion: [
        '¿En cuáles de sus procesos sería aceptable un error en uno de cada dos casos si hay revisión humana, y en cuáles no?',
        '¿Quién de su equipo revisaría los casos que el agente no logra terminar, y cuánto tiempo le tomaría?',
        '¿Qué medirían el primer mes para decidir si la automatización se queda?'
      ],
      sources: [
        { title: 'Anthropic — Introducing Claude Fable 5.2 and Claude Mythos 5.2 (9 nov 2026)', url: 'https://www.anthropic.com/claude-fable-and-mythos-5-2' },
        { title: 'Anthropic — Claude can design electronic prototypes from start to finish (9 nov 2026)', url: 'https://www.anthropic.com/research/claude-electronics-design' },
        { title: 'IBM Newsroom — IBM and Microsoft Announce a New AI Agent Platform Designed for Industry-Specific Transformation (10 nov 2026)', url: 'https://newsroom.ibm.com/2026-11-10-ibm-and-microsoft-announce-a-new-ai-agent-platform-designed-for-industry-specific-transformation' },
        { title: 'Microsoft Source LATAM — Microsoft e IBM lanzan plataforma de agentes de IA para empresas', url: 'https://news.microsoft.com/source/latam/noticias-de-microsoft/microsoft-ibm-plataforma-agentes-ia-empresas/' }
      ]
    }
  },
  {
    id: 'agents-in-production-nov-2026',
    topic: 'intelligence',
    image: '/projects/caviq/crm-desktop.webp',
    minutes: 5,
    published: '2026-11-18',
    en: {
      slug: 'ai-agents-in-production-start-with-the-process',
      title: 'AI agents in production: approved definitions, inherited permissions and earned autonomy',
      summary: 'Two pieces of news from this month show what companies that already run AI agents at scale do before turning them on: they agree on what each business term means, they give agents the same permissions as the person behind them, and they keep a human reviewer until accuracy is proven. None of that requires a new tool to start.',
      takeaway: 'The companies that get agents into production fix the process first and let autonomy be earned with measured accuracy. Before automating, agree on definitions, map the flow and remove the steps that add no value.',
      sections: [
        {
          id: 'news',
          heading: 'What happened this month',
          paragraphs: [
            'On November 3, 2026, Snowflake announced Business Ontology, a capability where teams approve official definitions of business terms, such as net revenue, link them to the underlying tables and serve only those approved definitions to AI agents. In the same announcement, the company said its Cortex AI Gateway applies existing access policies to agent tool calls, so agents inherit the controls already set for human users. According to Snowflake\'s documentation, the gateway\'s inference, observability and cost management reached general availability that day, while Business Ontology is described as coming to public preview.',
            'On November 14, SiliconANGLE reported on a talk by Luke Corbin of AT&T: the company has nearly 500 agentic AI workflows in production and plans to triple that number next year. According to that coverage, every workflow starts with a person in the loop, and the human checkpoint is removed only when accuracy reaches the mid to high 90 % range within an acceptable risk profile. These figures come from press coverage of a single talk, not from an AT&T document, and we could not open the articles directly from our environment.'
          ]
        },
        {
          id: 'definitions',
          heading: 'Lesson 1: agree on what the words mean',
          paragraphs: [
            'An agent that answers "how much did we sell last month?" will give a different number depending on whether it includes returns, taxes or discounts. Snowflake\'s own blog describes the case where Finance and Sales each have an approved "net revenue" definition, and the agent asks the user which one they mean instead of guessing. Changes to an approved definition go in as proposals, and agents keep using the approved version until a data steward accepts the change.',
            'This is not new in continuous improvement. It is the operational definition: before measuring, the team writes down exactly what is counted and how. A small company can do it today with a one-page glossary of its ten most used indicators, with the owner of each one, long before it buys any platform.'
          ]
        },
        {
          id: 'autonomy',
          heading: 'Lesson 2: autonomy is earned, not configured',
          paragraphs: [
            'AT&T\'s rule, as reported, is simple: a person reviews until the numbers show the agent can work alone. The same coverage says the company\'s platform maps existing workflows, identifies unnecessary steps and handoffs between areas, and removes them before introducing an agent, and that it monitors performance continuously to catch drift.',
            'That order, first remove waste and then automate, is the basic advice of Lean: automating a bad process only makes the waste faster. It also matches what we wrote on November 14: on business workflow benchmarks, the best published scores are still around half of the cases. Planning for human review is not distrust, it is the way to collect the evidence that later justifies removing it.'
          ]
        },
        {
          id: 'sme',
          heading: 'What a Costa Rican SME can do this week',
          paragraphs: [
            'Pick one flow, such as receiving and answering quote requests, and draw it on paper with the team: each step, who does it and how long it waits. Mark the steps that only move information from one place to another, and the ones nobody can explain. Remove or merge those first.',
            'Then define in writing the three or four terms the flow depends on ("approved quote", "urgent client", "delivery date") and who owns each definition. Only after that, test the automation with a person reviewing every case, and record how many proposals are accepted without changes. Decide in advance what percentage you need before removing the review, and for which cases it will never be removed.',
            'Synthetic example: a fictional hardware distributor in Heredia wants an agent to answer stock questions on WhatsApp. When mapping the flow, they discover that "available" means one thing for the warehouse and another for sales, because sales counts merchandise already reserved. They agree on a single definition, assign the warehouse lead as its owner, and only then start the test with daily review.'
          ]
        }
      ],
      discussion: [
        'Which three terms in your business would two areas define differently today?',
        'What accuracy would an automated step need in your company before you stopped reviewing it, and who would decide?',
        'Which step in your most repetitive process exists only to move information from one place to another?'
      ],
      sources: [
        { title: 'Snowflake — Snowflake Helps Enterprises Deploy AI Agents with Trusted Business Context and Built-In Controls (Nov 3, 2026)', url: 'https://www.snowflake.com/en/news/press-releases/expedition-2026-business-ontology-ai-gateway/' },
        { title: 'Snowflake — Business Ontology: Governed Context for AI', url: 'https://www.snowflake.com/en/blog/business-ontology-context/' },
        { title: 'Snowflake Documentation — Nov 3, 2026: Cortex AI Gateway inference, observability, and cost management (General availability)', url: 'https://docs.snowflake.com/en/release-notes/2026/other/2026-11-03-cortex-ai-gateway-ga' },
        { title: 'SiliconANGLE — AT&T uses agentic AI to reinvent business processes from the ground up (Nov 14, 2026)', url: 'https://siliconangle.com/2026/11/14/att-uses-agentic-ai-to-reinvent-business-processes-from-the-ground-up/' }
      ]
    },
    es: {
      slug: 'agentes-ia-en-produccion-primero-el-proceso',
      title: 'Agentes de IA en producción: definiciones aprobadas, permisos heredados y autonomía que se gana',
      summary: 'Dos noticias de este mes muestran qué hacen antes de encender los agentes las empresas que ya los usan a gran escala: se ponen de acuerdo en qué significa cada término del negocio, les dan a los agentes los mismos permisos que a la persona detrás de ellos y mantienen a una persona revisando hasta comprobar la precisión. Nada de eso requiere una herramienta nueva para empezar.',
      takeaway: 'Las empresas que llevan agentes a producción arreglan primero el proceso y dejan que la autonomía se gane con precisión medida. Antes de automatizar, acuerde las definiciones, dibuje el flujo y elimine los pasos que no agregan valor.',
      sections: [
        {
          id: 'news',
          heading: 'Qué pasó este mes',
          paragraphs: [
            'El 3 de noviembre de 2026 Snowflake anunció Business Ontology, una función en la que los equipos aprueban definiciones oficiales de términos del negocio, como el ingreso neto, las vinculan con las tablas de origen y entregan a los agentes de IA solo esas definiciones aprobadas. En el mismo anuncio la empresa indicó que su Cortex AI Gateway aplica las políticas de acceso existentes a las acciones de los agentes, de modo que los agentes heredan los controles ya definidos para las personas. Según la documentación de Snowflake, la inferencia, la observabilidad y el control de costos del gateway pasaron a disponibilidad general ese día, mientras que Business Ontology se describe como próxima a vista previa pública.',
            'El 14 de noviembre SiliconANGLE publicó una nota sobre una charla de Luke Corbin, de AT&T: la empresa tiene cerca de 500 flujos con agentes de IA en producción y planea triplicar esa cantidad el próximo año. Según esa cobertura, todo flujo empieza con una persona revisando, y ese control humano se retira solo cuando la precisión llega a un rango de entre 95 % y 99 % aproximadamente, dentro de un perfil de riesgo aceptable. Son cifras de la cobertura de prensa de una sola charla, no de un documento de AT&T, y no pudimos abrir los artículos directamente desde nuestro entorno.'
          ]
        },
        {
          id: 'definitions',
          heading: 'Lección 1: acordar qué significan las palabras',
          paragraphs: [
            'Un agente que responde "¿cuánto vendimos el mes pasado?" dará un número distinto según incluya o no devoluciones, impuestos o descuentos. El propio blog de Snowflake describe el caso en que Finanzas y Ventas tienen cada una su definición aprobada de "ingreso neto", y el agente le pregunta al usuario a cuál se refiere en lugar de adivinar. Los cambios a una definición aprobada entran como propuestas, y los agentes siguen usando la versión aprobada hasta que un responsable de datos acepta el cambio.',
            'Esto no es nuevo en mejora continua. Es la definición operacional: antes de medir, el equipo escribe exactamente qué se cuenta y cómo. Una pyme puede hacerlo hoy con un glosario de una página de sus diez indicadores más usados, con el responsable de cada uno, mucho antes de comprar cualquier plataforma.'
          ]
        },
        {
          id: 'autonomy',
          heading: 'Lección 2: la autonomía se gana, no se configura',
          paragraphs: [
            'La regla de AT&T, según lo reportado, es sencilla: una persona revisa hasta que los números muestran que el agente puede trabajar solo. La misma cobertura indica que la plataforma de la empresa dibuja los flujos existentes, identifica pasos innecesarios y traspasos entre áreas, y los elimina antes de introducir un agente, y que vigila el desempeño de forma continua para detectar desviaciones.',
            'Ese orden, primero eliminar el desperdicio y después automatizar, es el consejo básico de Lean: automatizar un mal proceso solo hace más rápido el desperdicio. También coincide con lo que escribimos el 14 de noviembre: en pruebas de flujos de negocio, las mejores notas publicadas siguen cerca de la mitad de los casos. Planear la revisión humana no es desconfianza, es la forma de reunir la evidencia que después justifica retirarla.'
          ]
        },
        {
          id: 'sme',
          heading: 'Qué puede hacer una pyme costarricense esta semana',
          paragraphs: [
            'Elija un flujo, como recibir y contestar solicitudes de cotización, y dibújelo en papel con el equipo: cada paso, quién lo hace y cuánto tiempo espera. Marque los pasos que solo pasan información de un lugar a otro y los que nadie sabe explicar. Elimine o junte esos primero.',
            'Después defina por escrito los tres o cuatro términos de los que depende el flujo ("cotización aprobada", "cliente urgente", "fecha de entrega") y quién es responsable de cada definición. Solo entonces pruebe la automatización con una persona revisando cada caso, y anote cuántas propuestas se aceptan sin cambios. Decida de antemano qué porcentaje necesita para quitar la revisión, y en qué casos no se quitará nunca.',
            'Ejemplo sintético: un distribuidor ficticio de ferretería en Heredia quiere que un agente conteste consultas de inventario por WhatsApp. Al dibujar el flujo descubren que "disponible" significa una cosa para bodega y otra para ventas, porque ventas cuenta mercadería ya apartada. Acuerdan una sola definición, nombran responsable al encargado de bodega y solo entonces empiezan la prueba con revisión diaria.'
          ]
        }
      ],
      discussion: [
        '¿Cuáles tres términos de su negocio definirían hoy de forma distinta dos áreas?',
        '¿Qué precisión necesitaría un paso automatizado en su empresa antes de dejar de revisarlo, y quién lo decidiría?',
        '¿Qué paso de su proceso más repetitivo existe solo para mover información de un lugar a otro?'
      ],
      sources: [
        { title: 'Snowflake — Snowflake Helps Enterprises Deploy AI Agents with Trusted Business Context and Built-In Controls (3 nov 2026)', url: 'https://www.snowflake.com/en/news/press-releases/expedition-2026-business-ontology-ai-gateway/' },
        { title: 'Snowflake — Business Ontology: Governed Context for AI', url: 'https://www.snowflake.com/en/blog/business-ontology-context/' },
        { title: 'Snowflake Documentation — Cortex AI Gateway, disponibilidad general (3 nov 2026)', url: 'https://docs.snowflake.com/en/release-notes/2026/other/2026-11-03-cortex-ai-gateway-ga' },
        { title: 'SiliconANGLE — AT&T uses agentic AI to reinvent business processes from the ground up (14 nov 2026)', url: 'https://siliconangle.com/2026/11/14/att-uses-agentic-ai-to-reinvent-business-processes-from-the-ground-up/' }
      ]
    }
  },
  {
    id: 'cicr-excellence-awards-2026-results',
    topic: 'operations',
    image: '/projects/crimson/levantamientos-desktop.webp',
    minutes: 5,
    published: '2026-11-20',
    en: {
      slug: 'cicr-excellence-awards-2026-results',
      title: 'CICR Excellence Awards 2026: root causes, full capacity and what a small team can copy',
      summary: 'The Cámara de Industrias de Costa Rica gave out its XXIX Excellence Awards after the November 18 congress. The winning projects are about finding the cause of a problem, making room in a plant that was already full, and automating a manual data task. Here is what was published and how to use it without entering an award.',
      takeaway: 'The awarded projects did not start with a tool: they started with a measured problem and its cause. A small team can follow the same order with paper, a meeting and a simple error-proofing device.',
      sections: [
        {
          id: 'results',
          heading: 'What the CICR announced',
          paragraphs: [
            'According to the CICR release of November 19, 2026, the XXIX Excellence Awards recognized 26 organizations, at an event the chamber says was attended by more than 650 people. The National Excellence Award went to Zollner Electronics Costa Rica, which won in four of the seven areas of the model: culture, leadership and strategy; human talent; processes; and customers and markets.',
            'In Compromiso con la Excelencia, the improvement-project track, the CICR says 53 projects registered this year, the first time it reached that number, and 44 companies took part in the Excellence Program processes. The three best-rated projects presented live to the jury on November 18. Gold went to Abbott Medical Costa Rica, Electrophysiology Division, with a project to introduce a new product while all of its lines were running at full capacity. Silver went to Edwards Lifesciences Costa Rica, with a project that found the cause of manganese in the plant\'s water and installed a new filtration system.',
            'We read these results in search excerpts of the CICR release; cicr.com does not open from our environment, and the excerpts we saw do not name the bronze winner. The same release mentions a project that automated SAP data extraction with Python, without saying which company presented it, so we do not attribute it here. The congress program also included talks by Dag Kroslid (Norway) and David Hutchins (United Kingdom).'
          ]
        },
        {
          id: 'lessons',
          heading: 'Three patterns worth copying',
          paragraphs: [
            'Find the cause before buying the fix. The silver project did not start by buying a filter; it started by finding why manganese appeared in the water, and then chose the solution. That is the core of Six Sigma\'s DMAIC cycle: define, measure, analyze, and only then improve and control. In a small business the equivalent is to stop and ask "why" before replacing a supplier, a system or a person.',
            'Capacity is created by removing waste, not only by buying machines. The gold project had to fit a new product into lines that were already full. Without the project details we cannot say how they did it, but the usual Lean route is to measure where time is lost (changeovers, waiting, rework) and recover it. An office team can do the same with its week: measure how many hours go to rework and searching for information before hiring.',
            'Automation appears at the end, on a stable task. The Python project over SAP data is a reminder that automation is one more improvement tool, applied to a manual task that is already well defined. That is the order we have described in previous entries: map, simplify, then automate.'
          ]
        },
        {
          id: 'no-tech',
          heading: 'A no-technology technique to start: error-proofing',
          paragraphs: [
            'The Lean Enterprise Institute glossary defines error-proofing (poka-yoke) as methods that prevent a person from choosing the wrong part, leaving one out or installing it backwards, and distinguishes devices that stop the process from those that only warn. Its resource guide adds that a good device is simple, cheap, reliable and designed for the actual workplace, and an LEI article warns that a device that burdens people ends up being bypassed.',
            'In an office this can be as simple as a delivery tray with one slot per required document, so a missing document is visible; a quote template where the total is not filled in until the delivery date is written; or a dispatch checklist that must be signed before the invoice leaves. None of these needs software, and each one removes a known cause of rework.',
            'Synthetic example: a fictional furniture workshop in Cartago kept sending invoices without the purchase order number, and two clients returned them every month. Instead of buying a system, the administrator printed a cover sheet with a box for the order number and the team agreed that no invoice goes out without it. Returns are counted every Friday on a sheet stuck to the wall.'
          ]
        }
      ],
      discussion: [
        'Which recurring problem in your business are you about to fix with a purchase before knowing its cause?',
        'Where does your team lose the most hours each week: waiting, rework or searching for information?',
        'Which frequent mistake could you make impossible, or at least visible, with a sheet, a tray or a template?'
      ],
      sources: [
        { title: 'Cámara de Industrias de Costa Rica — Zollner Electronics obtiene la distinción más alta de los Premios a la Excelencia 2026 (Nov 19, 2026)', url: 'https://cicr.com/zollner-electronics-obtiene-la-distincion-mas-alta-de-los-premios-a-la-excelencia-2026/' },
        { title: 'Cámara de Industrias de Costa Rica — Congreso Excelencia 2026 (program)', url: 'https://cicr.com/congreso_excelencia_2026/' },
        { title: 'Lean Enterprise Institute — Lexicon: Error-Proofing', url: 'https://www.lean.org/lexicon-terms/error-proofing/' },
        { title: 'Lean Enterprise Institute — Poka Yoke: A Resource Guide', url: 'https://www.lean.org/lexicon-terms/poka-yoke/' },
        { title: 'Lean Enterprise Institute — Why Create Poka-yokes, and Why Disconnect Them?', url: 'https://www.lean.org/the-lean-post/articles/why-create-poka-yokes-and-why-disconnect-them/' }
      ]
    },
    es: {
      slug: 'premios-excelencia-cicr-2026-resultados',
      title: 'Premios a la Excelencia CICR 2026: causas raíz, plantas llenas y lo que un equipo pequeño puede copiar',
      summary: 'La Cámara de Industrias de Costa Rica entregó sus XXIX Premios a la Excelencia después del congreso del 18 de noviembre. Los proyectos premiados tratan de encontrar la causa de un problema, hacer espacio en una planta que ya estaba llena y automatizar una tarea manual con datos. Esto es lo publicado y cómo aprovecharlo sin concursar.',
      takeaway: 'Los proyectos premiados no empezaron por una herramienta: empezaron por un problema medido y su causa. Un equipo pequeño puede seguir el mismo orden con papel, una reunión y un dispositivo sencillo a prueba de errores.',
      sections: [
        {
          id: 'results',
          heading: 'Qué anunció la CICR',
          paragraphs: [
            'Según el comunicado de la CICR del 19 de noviembre de 2026, la XXIX Entrega de los Premios a la Excelencia reconoció a 26 organizaciones, en un acto al que, según la cámara, asistieron más de 650 personas. El Premio Nacional a la Excelencia fue para Zollner Electronics Costa Rica, que ganó en cuatro de las siete áreas del modelo: cultura, liderazgo y estrategia; talento humano; procesos, y clientes y mercados.',
            'En Compromiso con la Excelencia, la categoría de proyectos de mejora, la CICR indica que este año se inscribieron 53 proyectos, la primera vez que se llega a esa cifra, y que 44 empresas participaron en los procesos del Programa a la Excelencia. Los tres proyectos mejor calificados se presentaron en vivo ante el jurado el 18 de noviembre. El Oro fue para Abbott Medical Costa Rica, División Electrofisiología, con un proyecto para introducir un producto nuevo cuando todas sus líneas trabajaban a plena capacidad. La Plata fue para Edwards Lifesciences Costa Rica, con un proyecto que encontró la causa de la presencia de manganeso en el agua de su planta e instaló un nuevo sistema de filtración.',
            'Leímos estos resultados en extractos de búsqueda del comunicado de la CICR; cicr.com no abre desde nuestro entorno, y los extractos que vimos no nombran al ganador del Bronce. El mismo comunicado menciona un proyecto que automatizó en Python la extracción de datos de SAP, sin indicar qué empresa lo presentó, así que no lo atribuimos aquí. El programa del congreso incluyó además conferencias de Dag Kroslid (Noruega) y David Hutchins (Reino Unido).'
          ]
        },
        {
          id: 'lessons',
          heading: 'Tres patrones que vale la pena copiar',
          paragraphs: [
            'Encontrar la causa antes de comprar la solución. El proyecto de Plata no empezó comprando un filtro; empezó averiguando por qué aparecía manganeso en el agua, y después eligió la solución. Ese es el centro del ciclo DMAIC de Six Sigma: definir, medir, analizar y solo entonces mejorar y controlar. En una pyme el equivalente es detenerse a preguntar "¿por qué?" antes de cambiar de proveedor, de sistema o de persona.',
            'La capacidad se crea eliminando desperdicio, no solo comprando máquinas. El proyecto de Oro tuvo que meter un producto nuevo en líneas que ya estaban llenas. Sin el detalle del proyecto no podemos decir cómo lo hicieron, pero el camino habitual de Lean es medir dónde se pierde el tiempo (cambios de formato, esperas, reprocesos) y recuperarlo. Un equipo de oficina puede hacer lo mismo con su semana: medir cuántas horas se van en reprocesos y en buscar información antes de contratar.',
            'La automatización aparece al final, sobre una tarea estable. El proyecto en Python sobre datos de SAP recuerda que automatizar es una herramienta más de mejora, aplicada a una tarea manual que ya está bien definida. Es el orden que hemos descrito en entradas anteriores: dibujar el proceso, simplificarlo y después automatizar.'
          ]
        },
        {
          id: 'no-tech',
          heading: 'Una técnica sin tecnología para empezar: a prueba de errores',
          paragraphs: [
            'El glosario del Lean Enterprise Institute define el poka-yoke (a prueba de errores) como métodos que impiden que una persona elija la pieza equivocada, deje una por fuera o la instale al revés, y distingue los dispositivos que detienen el proceso de los que solo advierten. Su guía de recursos agrega que un buen dispositivo es simple, barato, confiable y pensado para el lugar de trabajo real, y un artículo del LEI advierte que un dispositivo que le complica la vida a la gente termina siendo esquivado.',
            'En una oficina puede ser tan sencillo como una bandeja de entrega con un espacio por cada documento obligatorio, para que el faltante se vea; una plantilla de cotización donde el total no se llena hasta escribir la fecha de entrega; o una lista de despacho que se firma antes de que salga la factura. Nada de esto requiere software, y cada uno elimina una causa conocida de reproceso.',
            'Ejemplo sintético: un taller ficticio de muebles en Cartago enviaba facturas sin el número de orden de compra, y dos clientes las devolvían cada mes. En lugar de comprar un sistema, la administradora imprimió una hoja de portada con una casilla para el número de orden y el equipo acordó que ninguna factura sale sin él. Las devoluciones se cuentan cada viernes en una hoja pegada en la pared.'
          ]
        }
      ],
      discussion: [
        '¿Qué problema recurrente de su negocio está a punto de resolver con una compra antes de conocer su causa?',
        '¿Dónde pierde más horas su equipo cada semana: esperas, reprocesos o buscando información?',
        '¿Qué error frecuente podría volver imposible, o al menos visible, con una hoja, una bandeja o una plantilla?'
      ],
      sources: [
        { title: 'Cámara de Industrias de Costa Rica — Zollner Electronics obtiene la distinción más alta de los Premios a la Excelencia 2026 (19 nov 2026)', url: 'https://cicr.com/zollner-electronics-obtiene-la-distincion-mas-alta-de-los-premios-a-la-excelencia-2026/' },
        { title: 'Cámara de Industrias de Costa Rica — Congreso Excelencia 2026 (programa)', url: 'https://cicr.com/congreso_excelencia_2026/' },
        { title: 'Lean Enterprise Institute — Lexicon: Error-Proofing', url: 'https://www.lean.org/lexicon-terms/error-proofing/' },
        { title: 'Lean Enterprise Institute — Poka Yoke: A Resource Guide', url: 'https://www.lean.org/lexicon-terms/poka-yoke/' },
        { title: 'Lean Enterprise Institute — Why Create Poka-yokes, and Why Disconnect Them?', url: 'https://www.lean.org/the-lean-post/articles/why-create-poka-yokes-and-why-disconnect-them/' }
      ]
    }
  },
  {
    id: 'verification-bottleneck-nov-2026',
    topic: 'intelligence',
    image: '/projects/caviq/reports-desktop.webp',
    minutes: 5,
    published: '2026-11-21',
    en: {
      slug: 'ai-moves-the-bottleneck-to-review',
      title: 'When AI produces faster than you can review: the new bottleneck is verification',
      summary: 'This month a data platform opened to the public an agent that diagnoses failures and proposes fixes, but never applies them without a person approving. In the lean community, a November article argues that AI agents move the bottleneck from doing the work to checking it. Both point to an old Lean rule: limit work in process.',
      takeaway: 'The right number of tasks to hand an AI, or a new hire, is not as many as it can produce but as many as your team can review well. Limit what waits for review, make it visible and stop the line when the queue fills.',
      sections: [
        {
          id: 'news',
          heading: 'What was announced this month',
          paragraphs: [
            'On November 19, 2026, Databricks announced the public beta of Genie ZeroOps, an agent that watches data pipelines and jobs, finds the likely cause of a failure using lineage and quality metrics, and proposes a fix. According to Databricks, it does not change production data or code unless a user approves: it can push the fix to a new branch so it goes through the team\'s normal review. The beta adds shared inboxes, notifications and custom instructions so each team can filter what it considers a real problem.',
            'Two figures from the vendor are worth noting, as reported by Databricks and not independently verified: during the private preview the agent observed more than 80,000 customer issues, and Databricks says more than half of them required organization-specific knowledge to triage and resolve. In other words, the agent can find and propose, but knowing what matters still depends on the people who know the business.',
            'We read these details in search excerpts of the Databricks blog and documentation; databricks.com does not open from our environment.'
          ]
        },
        {
          id: 'lean',
          heading: 'The lean reading: production is no longer the constraint',
          paragraphs: [
            'On November 9, 2026, the Lean Enterprise Institute listed an article by Remo H. Jansen that revisits the Toyota Production System in the age of coding agents. His argument, also published on DEV Community: if an agent can produce changes faster than people can establish that they are correct, the bottleneck has moved to verification. He proposes treating each verifiable rule as an andon cord and giving agents something like work-in-process limits; in his version, an agent that accumulates too many unverified changes must stop and verify before continuing. Those thresholds are the author\'s proposal, not an established standard.',
            'The idea is not new for Lean. The LEI lexicon defines work in process as items waiting between processing steps, and an LEI article on personal kanban explains that a board does two things: it makes work visible and it limits how much can be in progress at once. In The Birth of Lean, Taiichi Ohno is quoted saying that reducing work in process is not the goal in itself; the goal is to expose problems.',
            'Applied to automation: if a tool, an agent or a new assistant produces twenty quotes a day and the manager can review eight, the other twelve do not represent progress. They are inventory waiting, with errors that nobody has seen yet.'
          ]
        },
        {
          id: 'no-tech',
          heading: 'A no-technology technique: the review tray with three slots',
          paragraphs: [
            'Before using an agent, any team can try the rule with paper. Put a tray, a column on a board or a folder labeled "to review" with a fixed number of slots, for example three. Whoever prepares a quote, an invoice or a report places it there. When the three slots are full, nobody prepares a fourth: they help review or fix what is waiting. That is a work-in-process limit, and it is the same rule that would later apply to an AI.',
            'Synthetic example: a fictional accounting office in Heredia began using a tool that drafted client reconciliations in minutes. In two weeks it had more than forty drafts waiting and the accountant was finding the same error in several of them. The team set a limit of five drafts pending review on a whiteboard, wrote down the cause of each correction and fixed the most frequent one in the template before generating more. The pace looked slower, but finished, correct reconciliations went up.',
            'Two counts are enough to start: how many items are waiting for review at the end of each day, and how many come back with corrections. If the first grows week after week, you are producing faster than you can verify, with or without AI.'
          ]
        }
      ],
      discussion: [
        'How many items does your team leave waiting for review at the end of a normal day?',
        'Who checks the work today, and how many items can that person review well in a day?',
        'If you used an AI tomorrow to prepare quotes or reports, what limit would you put on drafts waiting for approval?'
      ],
      sources: [
        { title: 'Databricks — Genie ZeroOps, now in public beta: an autonomous agent that fixes data pipelines, with lessons from 80,000 customer issues (Nov 19, 2026)', url: 'https://www.databricks.com/blog/genie-zeroops-now-public-beta-autonomous-agent-fixes-data-pipelines-lessons-80000-customer' },
        { title: 'Databricks documentation — Genie ZeroOps', url: 'https://docs.databricks.com/gcp/en/zeroops/' },
        { title: 'Remo H. Jansen — Revisiting the Toyota Production System (TPS) in the Age of Coding Agents (DEV Community; listed by LEI on Nov 9, 2026)', url: 'https://dev.to/remojansen/revisiting-the-toyota-production-system-tps-in-the-age-of-coding-agents-2bb5' },
        { title: 'Lean Enterprise Institute — Lexicon: Work-in-Process', url: 'https://www.lean.org/lexicon-terms/work-in-process/' },
        { title: 'Lean Enterprise Institute — Personal Kanban: You Can\'t Manage What You Can\'t See', url: 'https://www.lean.org/the-lean-post/articles/personal-kanban-you-cant-manage-what-you-cant-see/' },
        { title: 'Lean Enterprise Institute — The Birth of Lean (PDF)', url: 'https://www.lean.org/downloads/320.pdf' }
      ]
    },
    es: {
      slug: 'ia-mueve-el-cuello-de-botella-a-la-revision',
      title: 'Cuando la IA produce más rápido de lo que usted revisa: el nuevo cuello de botella es la verificación',
      summary: 'Este mes una plataforma de datos abrió al público un agente que diagnostica fallas y propone soluciones, pero nunca las aplica sin que una persona apruebe. En la comunidad Lean, un artículo de noviembre sostiene que los agentes de IA mueven el cuello de botella de hacer el trabajo a revisarlo. Ambos apuntan a una regla vieja de Lean: limitar el trabajo en proceso.',
      takeaway: 'La cantidad correcta de tareas para darle a una IA, o a una persona nueva, no es cuantas pueda producir sino cuantas su equipo pueda revisar bien. Limite lo que espera revisión, hágalo visible y detenga la línea cuando la cola se llena.',
      sections: [
        {
          id: 'news',
          heading: 'Qué se anunció este mes',
          paragraphs: [
            'El 19 de noviembre de 2026, Databricks anunció la beta pública de Genie ZeroOps, un agente que vigila flujos de datos y tareas programadas, busca la causa probable de una falla con el linaje y las métricas de calidad de los datos, y propone una corrección. Según Databricks, no cambia datos ni código en producción sin que un usuario lo apruebe: puede dejar la corrección en una rama nueva para que pase por la revisión normal del equipo. La beta agrega bandejas compartidas, notificaciones e instrucciones personalizadas para que cada equipo filtre lo que considera un problema real.',
            'Hay dos cifras del proveedor que vale la pena anotar, reportadas por Databricks y no verificadas de forma independiente: durante la vista previa privada el agente observó más de 80.000 incidentes de clientes, y Databricks indica que más de la mitad requerían conocimiento propio de la organización para clasificarlos y resolverlos. Es decir, el agente puede encontrar y proponer, pero saber qué importa sigue dependiendo de quienes conocen el negocio.',
            'Leímos estos detalles en extractos de búsqueda del blog y la documentación de Databricks; databricks.com no abre desde nuestro entorno.'
          ]
        },
        {
          id: 'lean',
          heading: 'La lectura Lean: producir ya no es la restricción',
          paragraphs: [
            'El 9 de noviembre de 2026, el Lean Enterprise Institute listó un artículo de Remo H. Jansen que revisa el Sistema de Producción Toyota en la era de los agentes de programación. Su argumento, publicado también en DEV Community: si un agente produce cambios más rápido de lo que las personas pueden comprobar que son correctos, el cuello de botella pasó a la verificación. Propone tratar cada regla verificable como un cordón andon y darles a los agentes algo parecido a límites de trabajo en proceso; en su versión, un agente que acumula demasiados cambios sin verificar debe detenerse a verificar antes de seguir. Esos umbrales son una propuesta del autor, no un estándar establecido.',
            'La idea no es nueva para Lean. El glosario del LEI define el trabajo en proceso como los elementos que esperan entre un paso y otro, y un artículo del LEI sobre kanban personal explica que un tablero hace dos cosas: vuelve visible el trabajo y limita cuánto puede estar en curso a la vez. En The Birth of Lean se cita a Taiichi Ohno diciendo que reducir el trabajo en proceso no es el objetivo en sí; el objetivo es sacar los problemas a la luz.',
            'Aplicado a la automatización: si una herramienta, un agente o un asistente nuevo produce veinte cotizaciones al día y la gerencia puede revisar ocho, las otras doce no son avance. Son inventario esperando, con errores que nadie ha visto todavía.'
          ]
        },
        {
          id: 'no-tech',
          heading: 'Una técnica sin tecnología: la bandeja de revisión con tres espacios',
          paragraphs: [
            'Antes de usar un agente, cualquier equipo puede probar la regla con papel. Ponga una bandeja, una columna en una pizarra o una carpeta rotulada "por revisar" con un número fijo de espacios, por ejemplo tres. Quien prepara una cotización, una factura o un informe la deja ahí. Cuando los tres espacios están llenos, nadie prepara una cuarta: se ayuda a revisar o a corregir lo que espera. Eso es un límite de trabajo en proceso, y es la misma regla que después aplicaría a una IA.',
            'Ejemplo sintético: una oficina contable ficticia en Heredia empezó a usar una herramienta que preparaba borradores de conciliaciones de clientes en minutos. En dos semanas tenía más de cuarenta borradores esperando y la contadora encontraba el mismo error en varios. El equipo fijó un límite de cinco borradores pendientes de revisión en una pizarra, anotó la causa de cada corrección y arregló la más frecuente en la plantilla antes de generar más. El ritmo pareció más lento, pero subieron las conciliaciones terminadas y correctas.',
            'Para empezar bastan dos conteos: cuántos elementos quedan esperando revisión al final de cada día y cuántos regresan con correcciones. Si el primero crece semana tras semana, está produciendo más rápido de lo que puede verificar, con o sin IA.'
          ]
        }
      ],
      discussion: [
        '¿Cuántos elementos deja su equipo esperando revisión al final de un día normal?',
        '¿Quién revisa el trabajo hoy, y cuántos elementos puede revisar bien esa persona en un día?',
        'Si mañana usara una IA para preparar cotizaciones o informes, ¿qué límite le pondría a los borradores que esperan aprobación?'
      ],
      sources: [
        { title: 'Databricks — Genie ZeroOps, now in public beta: an autonomous agent that fixes data pipelines, with lessons from 80,000 customer issues (19 nov 2026)', url: 'https://www.databricks.com/blog/genie-zeroops-now-public-beta-autonomous-agent-fixes-data-pipelines-lessons-80000-customer' },
        { title: 'Documentación de Databricks — Genie ZeroOps', url: 'https://docs.databricks.com/gcp/en/zeroops/' },
        { title: 'Remo H. Jansen — Revisiting the Toyota Production System (TPS) in the Age of Coding Agents (DEV Community; listado por el LEI el 9 nov 2026)', url: 'https://dev.to/remojansen/revisiting-the-toyota-production-system-tps-in-the-age-of-coding-agents-2bb5' },
        { title: 'Lean Enterprise Institute — Lexicon: Work-in-Process', url: 'https://www.lean.org/lexicon-terms/work-in-process/' },
        { title: 'Lean Enterprise Institute — Personal Kanban: You Can\'t Manage What You Can\'t See', url: 'https://www.lean.org/the-lean-post/articles/personal-kanban-you-cant-manage-what-you-cant-see/' },
        { title: 'Lean Enterprise Institute — The Birth of Lean (PDF)', url: 'https://www.lean.org/downloads/320.pdf' }
      ]
    }
  },
  {
    id: 'terms-of-automation-nov-2026',
    topic: 'operations',
    image: '/projects/crimson/levantamientos-desktop.webp',
    minutes: 5,
    published: '2026-11-22',
    en: {
      slug: 'terms-of-automation-who-approves-who-benefits',
      title: 'Automating on your own terms: who approves, who benefits and what your best people know',
      summary: 'This month an agent platform launched a gateway that decides which tools an AI agent may call, with whose credentials and with what record. In the lean community, two November articles ask the questions that come before any tool: who benefits from the time saved, and how to turn what experienced people know into something the whole team can follow.',
      takeaway: 'Before an agent touches a process, write down three things on one page: what it may do on its own, what needs a second person to approve, and where the time it saves will go. If you cannot write them, the process is not ready to automate.',
      sections: [
        {
          id: 'news',
          heading: 'What was announced this month',
          paragraphs: [
            'On November 19, 2026, LangChain released LangSmith Tool Gateway in public beta, a managed layer that sits between AI agents and the tools they call. According to its documentation, administrators can set policies that either block a tool call or require approval before it runs, and when several policies match, the block wins. Each call can be recorded with the tool, the server, the identity that acted and the outcome, and changes to servers, profiles and policies go to the organization\'s audit log. For agents that run with nobody signed in, an administrator connects shared credentials once in a profile; the agent cannot connect its own.',
            'One detail is worth more than the rest. The documentation says the approval comes from the person using the client, not from a separate reviewer, and lists approval by a separate reviewer as not available. That is useful for stopping an accidental action, but it is not the classic control where one person prepares and another approves. For payments, discounts or changes to customer data, that second person still has to be designed into the process.',
            'We read these details in search excerpts of the LangChain blog and documentation; langchain.com does not open from our environment. The product is in beta and its limits may change.'
          ]
        },
        {
          id: 'lean',
          heading: 'The lean reading: the terms matter more than the tool',
          paragraphs: [
            'On November 16, 2026, Roberto Priolo published in the Lean Enterprise Institute\'s Lean Post an article titled "Yes, Lean Thinkers Are Luddites. The Original Kind." His point: today "Luddite" means someone who resists technology, but the original movement objected to the terms on which it arrived: who benefited, whose skill was erased and what happened to the quality of the work. Applied to AI, he argues the gains will show up as small time savings that get absorbed into more work unless someone decides where they go, and he cites a company that frames AI as talent development rather than cost cutting.',
            'On November 3, Darril Wilburn, a former leader at Toyota Motor Manufacturing Kentucky, described in the same publication how Toyota turned the practical wisdom of its most experienced people into curriculum when it expanded abroad. In Kentucky, he writes, there had been too much dependence on Japanese coordinators and trainers. Part of the answer was interviewing a former executive over several Saturdays to write down how he solved problems, which led to a practical problem-solving course. His summary: curriculum raises the floor for the front line, and the expert, with more time, raises the ceiling.',
            'Put together with the gateway: an agent can only follow rules that someone wrote down. If the way your best person decides which quotes to approve lives only in their head, neither a new hire nor an AI can follow it.'
          ]
        },
        {
          id: 'no-tech',
          heading: 'A no-technology technique: the one-page terms sheet',
          paragraphs: [
            'Before automating, sit for an hour with the person who knows the process best and fill out one sheet with four blocks. First, the steps in order, as that person actually does them. Second, the key points: what they check that nobody else checks, and why. Third, the permissions: what may be done without asking, what needs a second person, and what is never done. Fourth, the time saved: if the task takes half as long, where those hours go, for example to calling customers with late payments or to training someone new.',
            'Synthetic example: a fictional hardware distributor in Cartago wanted to use an assistant to prepare price quotes. When the sales manager filled out the sheet, it turned out she reviewed the delivery address against the customer\'s credit zone, a step that was not written anywhere. The team added it as a key point, set that any discount above a fixed limit needed the manager\'s initials, and agreed that the time saved would go to following up quotes not yet answered. Only then did they try the tool.',
            'The sheet works the same on paper, with a new hire or with an agent. If a process cannot fit on one page with clear permissions, the first improvement is not automation: it is simplifying the process.'
          ]
        }
      ],
      discussion: [
        'Which decision in your business depends on a single person, and is it written down anywhere?',
        'If a tool saved your team five hours a week, who would decide where those hours go?',
        'Which actions in your process should always need a second person to approve, even if an AI prepares them?'
      ],
      sources: [
        { title: 'LangChain — LangSmith Tool Gateway: Secure, governed tool use for agents (Nov 19, 2026)', url: 'https://www.langchain.com/blog/langsmith-tool-gateway' },
        { title: 'LangChain documentation — How Tool Gateway works', url: 'https://docs.langchain.com/langsmith/tool-gateway-how-it-works' },
        { title: 'LangChain documentation — Tool Gateway traces and audit log', url: 'https://docs.langchain.com/langsmith/tool-gateway-traces' },
        { title: 'Lean Enterprise Institute — Yes, Lean Thinkers Are Luddites. The Original Kind. (Roberto Priolo, Nov 16, 2026)', url: 'https://www.lean.org/the-lean-post/articles/yes-lean-thinkers-are-luddites-the-original-kind/' },
        { title: 'Lean Enterprise Institute — Raising the Floor and the Ceiling: How Toyota Turned Practical Wisdom into Curriculum (Darril Wilburn, Nov 3, 2026)', url: 'https://www.lean.org/the-lean-post/articles/raising-the-floor-and-the-ceiling-how-toyota-turned-practical-wisdom-into-curriculum/' }
      ]
    },
    es: {
      slug: 'automatizar-en-sus-propios-terminos',
      title: 'Automatizar en sus propios términos: quién aprueba, quién se beneficia y qué sabe su mejor gente',
      summary: 'Este mes una plataforma de agentes lanzó una pasarela que decide qué herramientas puede usar un agente de IA, con qué credenciales y con qué registro. En la comunidad Lean, dos artículos de noviembre hacen las preguntas que van antes de cualquier herramienta: quién se queda con el tiempo ahorrado y cómo convertir lo que saben las personas con experiencia en algo que todo el equipo pueda seguir.',
      takeaway: 'Antes de que un agente toque un proceso, escriba tres cosas en una hoja: qué puede hacer solo, qué necesita que otra persona apruebe y a dónde va el tiempo que ahorre. Si no puede escribirlas, el proceso todavía no está listo para automatizarse.',
      sections: [
        {
          id: 'news',
          heading: 'Qué se anunció este mes',
          paragraphs: [
            'El 19 de noviembre de 2026, LangChain lanzó en beta pública LangSmith Tool Gateway, una capa administrada que se ubica entre los agentes de IA y las herramientas que llaman. Según su documentación, los administradores pueden definir políticas que bloquean una llamada o exigen aprobación antes de ejecutarla, y cuando aplican varias, gana el bloqueo. Cada llamada puede quedar registrada con la herramienta, el servidor, la identidad que actuó y el resultado, y los cambios a servidores, perfiles y políticas van a la bitácora de auditoría de la organización. Para agentes que trabajan sin nadie conectado, un administrador conecta una sola vez credenciales compartidas en un perfil; el agente no puede conectar las suyas.',
            'Hay un detalle que vale más que el resto. La documentación indica que la aprobación la da la misma persona que usa el cliente, no un revisor aparte, y señala que la aprobación por un revisor separado no está disponible. Eso sirve para frenar una acción accidental, pero no es el control clásico en que una persona prepara y otra aprueba. Para pagos, descuentos o cambios en datos de clientes, esa segunda persona todavía hay que diseñarla dentro del proceso.',
            'Leímos estos detalles en extractos de búsqueda del blog y la documentación de LangChain; langchain.com no abre desde nuestro entorno. El producto está en beta y sus límites pueden cambiar.'
          ]
        },
        {
          id: 'lean',
          heading: 'La lectura Lean: importan más los términos que la herramienta',
          paragraphs: [
            'El 16 de noviembre de 2026, Roberto Priolo publicó en el Lean Post del Lean Enterprise Institute un artículo titulado "Yes, Lean Thinkers Are Luddites. The Original Kind." Su punto: hoy "ludita" significa alguien que se resiste a la tecnología, pero el movimiento original objetaba los términos en que llegaba: quién se beneficiaba, qué destreza se borraba y qué pasaba con la calidad del trabajo. Aplicado a la IA, sostiene que las ganancias aparecerán como pequeños ahorros de tiempo que se absorben en más trabajo, salvo que alguien decida a dónde van, y cita a una empresa que plantea la IA como desarrollo de talento y no como recorte de costos.',
            'El 3 de noviembre, Darril Wilburn, exlíder de Toyota Motor Manufacturing Kentucky, contó en la misma publicación cómo Toyota convirtió la sabiduría práctica de su gente con más experiencia en un currículo cuando se expandió fuera de Japón. En Kentucky, escribe, había demasiada dependencia de los coordinadores y entrenadores japoneses. Parte de la respuesta fue entrevistar durante varios sábados a un exejecutivo para poner por escrito cómo resolvía problemas, lo que dio origen a un curso de resolución práctica de problemas. Su resumen: el currículo sube el piso de la primera línea, y el experto, con más tiempo, sube el techo.',
            'Unido a la pasarela: un agente solo puede seguir reglas que alguien escribió. Si la forma en que su mejor persona decide qué cotizaciones aprobar vive solo en su cabeza, ni una persona nueva ni una IA la pueden seguir.'
          ]
        },
        {
          id: 'no-tech',
          heading: 'Una técnica sin tecnología: la hoja de términos de una página',
          paragraphs: [
            'Antes de automatizar, siéntese una hora con la persona que mejor conoce el proceso y llenen una hoja con cuatro bloques. Primero, los pasos en orden, como esa persona los hace de verdad. Segundo, los puntos clave: qué revisa que nadie más revisa, y por qué. Tercero, los permisos: qué se puede hacer sin preguntar, qué necesita una segunda persona y qué no se hace nunca. Cuarto, el tiempo ahorrado: si la tarea toma la mitad, a dónde van esas horas, por ejemplo a llamar a clientes con pagos atrasados o a entrenar a alguien nuevo.',
            'Ejemplo sintético: una distribuidora ficticia de ferretería en Cartago quería usar un asistente para preparar cotizaciones. Al llenar la hoja con la gerente de ventas, apareció que ella revisaba la dirección de entrega contra la zona de crédito del cliente, un paso que no estaba escrito en ningún lado. El equipo lo agregó como punto clave, definió que todo descuento por encima de un límite fijo llevaba las iniciales de la gerente y acordó que el tiempo ahorrado iría a dar seguimiento a cotizaciones sin respuesta. Solo entonces probaron la herramienta.',
            'La hoja funciona igual en papel, con una persona nueva o con un agente. Si un proceso no cabe en una página con permisos claros, la primera mejora no es automatizar: es simplificar el proceso.'
          ]
        }
      ],
      discussion: [
        '¿Qué decisión de su negocio depende de una sola persona, y está escrita en algún lado?',
        'Si una herramienta le ahorrara cinco horas por semana a su equipo, ¿quién decidiría a dónde van esas horas?',
        '¿Qué acciones de su proceso deberían necesitar siempre la aprobación de una segunda persona, aunque las prepare una IA?'
      ],
      sources: [
        { title: 'LangChain — LangSmith Tool Gateway: Secure, governed tool use for agents (19 nov 2026)', url: 'https://www.langchain.com/blog/langsmith-tool-gateway' },
        { title: 'Documentación de LangChain — How Tool Gateway works', url: 'https://docs.langchain.com/langsmith/tool-gateway-how-it-works' },
        { title: 'Documentación de LangChain — Tool Gateway traces and audit log', url: 'https://docs.langchain.com/langsmith/tool-gateway-traces' },
        { title: 'Lean Enterprise Institute — Yes, Lean Thinkers Are Luddites. The Original Kind. (Roberto Priolo, 16 nov 2026)', url: 'https://www.lean.org/the-lean-post/articles/yes-lean-thinkers-are-luddites-the-original-kind/' },
        { title: 'Lean Enterprise Institute — Raising the Floor and the Ceiling: How Toyota Turned Practical Wisdom into Curriculum (Darril Wilburn, 3 nov 2026)', url: 'https://www.lean.org/the-lean-post/articles/raising-the-floor-and-the-ceiling-how-toyota-turned-practical-wisdom-into-curriculum/' }
      ]
    }
  },
  {
    id: 'sop-is-the-ai-input-nov-2026',
    topic: 'operations',
    image: '/projects/caviq/rrhh-desktop.webp',
    minutes: 5,
    published: '2026-11-23',
    en: {
      slug: 'your-procedure-is-now-the-ai-input',
      title: 'Your written procedure is now the AI\'s input: what is not written down, the agent does not know',
      summary: 'This month a cloud provider launched a service that turns a standard operating procedure into a plan that AI agents execute, case by case, while people handle approvals and exceptions. The useful part is not the agent: it is that the tool forces you to write down the exceptions nobody had documented. A lean podcast from November adds the other half: when a company grows, its management system has to grow with it.',
      takeaway: 'Before buying any agent, take your most repeated procedure and add a table of exceptions: if this happens, do this, and tell this person. If you cannot fill it, an AI will not be able to either.',
      sections: [
        {
          id: 'news',
          heading: 'What was announced this month',
          paragraphs: [
            'On November 19, 2026, Amazon Web Services announced the general availability of Resolutions in Amazon Connect, aimed at high-volume operational work such as refund requests, transaction disputes, fraud investigations and insurance claims. According to the announcement, a manager can describe a process in plain language or upload the standard operating procedures, and the service drafts a work plan. AI agents then gather information, apply the policy and act in business applications, while human specialists handle approvals and exceptions. Each action and decision is recorded.',
            'The documentation has three details that matter more than the agent. First, while drafting the plan, the assistant asks follow-up questions about exceptions, decision rules and approval thresholds, and flags cases the procedure does not cover; its own example is what to do when a customer does not answer an email after two days. Second, a plan cannot be published until every open item is resolved. Third, a published version cannot be changed: to modify it, you copy it, edit the copy and publish it as a new version.',
            'We read these details in search excerpts of the AWS announcement and documentation; aws.amazon.com does not open from our environment. Pricing is per case, in US dollars, and availability may vary by region.'
          ]
        },
        {
          id: 'lean',
          heading: 'The lean reading: standard work and a management system that grows',
          paragraphs: [
            'Look at what the service does: it asks for the procedure, finds the gaps, does not let you publish with open items and keeps a locked version until someone approves a new one. That is the discipline of standard work in lean: the current best known way of doing a job, written down, followed by everyone and improved deliberately, not changed by whoever happens to be on shift. The tool did not invent it; it simply cannot work without it.',
            'In a November 2026 episode of the Lean Enterprise Institute podcast, "Growing Fast? Your Management System Needs to Keep Up", LEI president Josh Howell and Roberto Priolo of the Lean Global Network interview Adam Rens, president and co-owner of Switchgear Power Systems, a Wisconsin engineer-to-order manufacturer. According to the episode summary, the company faces a sharp increase in demand and in the size of its workforce, and lean has become a way to support that growth; the conversation also covers what it takes to change leadership behaviors. We read the summary, not the full transcript.',
            'The connection is direct: when a company adds people quickly, what lived in the heads of the founders stops being enough. Adding AI agents is the same as adding people very fast. If the procedure was not ready for a new hire, it is not ready for an agent.'
          ]
        },
        {
          id: 'no-tech',
          heading: 'A no-technology technique: the exceptions table and the version box',
          paragraphs: [
            'Take the procedure your team repeats most and add two things on paper. At the end, a three-column table: "If this happens", "Do this", "Tell this person". Fill it during one week: every time someone asks "and what do I do now?", that question becomes a row. At the top, a small box with the version number, the date, who approved it and what changed. Whoever changes the procedure without updating the box is not following it.',
            'Synthetic example: a fictional clinic in Heredia processed insurance refunds with a two-page procedure. In the first week, the exceptions table collected seven rows: an invoice with the wrong ID number, a patient who does not answer, an amount above the insurer\'s limit, among others. Three of those cases accounted for most of the delays. The team fixed two at the source, by checking the ID at reception, and set that refunds above a fixed amount need the administrator\'s initials. Version 2 of the procedure was a page shorter.',
            'That sheet is useful today with people and tomorrow with any tool. And if an agent ever runs the process, the table already tells you which cases it should hand back to a person.'
          ]
        }
      ],
      discussion: [
        'Which procedure in your business has exceptions that only one person knows how to handle?',
        'If someone changed a procedure today, how would the rest of the team find out?',
        'Which cases should an automated process always hand back to a person?'
      ],
      sources: [
        { title: 'AWS — Amazon Connect launches Resolutions, an agentic solution for high-volume operational work (Nov 19, 2026)', url: 'https://aws.amazon.com/about-aws/whats-new/2026/11/amazon-connect-resolutions/' },
        { title: 'AWS documentation — Resolve operational work with Resolutions in Amazon Connect Customer', url: 'https://docs.aws.amazon.com/connect/latest/adminguide/resolutions.html' },
        { title: 'Lean Enterprise Institute — Growing Fast? Your Management System Needs to Keep Up (podcast, Nov 2026)', url: 'https://www.lean.org/the-lean-post/articles/growing-fast-your-management-system-needs-to-keep-up/' },
        { title: 'Lean Enterprise Institute — Standard Work for Lean Leaders: One of the Keys to Sustaining Performance Gains', url: 'https://www.lean.org/the-lean-post/articles/standard-work-for-lean-leaders-one-of-the-keys-to-sustaining-performance-gains/' }
      ]
    },
    es: {
      slug: 'su-procedimiento-es-el-insumo-de-la-ia',
      title: 'Su procedimiento escrito ya es el insumo de la IA: lo que no está escrito, el agente no lo sabe',
      summary: 'Este mes un proveedor de nube lanzó un servicio que convierte un procedimiento operativo en un plan que ejecutan agentes de IA, caso por caso, mientras las personas atienden aprobaciones y excepciones. Lo útil no es el agente: es que la herramienta obliga a escribir las excepciones que nadie había documentado. Un pódcast Lean de noviembre agrega la otra mitad: cuando una empresa crece, su sistema de gestión tiene que crecer con ella.',
      takeaway: 'Antes de comprar cualquier agente, tome el procedimiento que más repite su equipo y agréguele una tabla de excepciones: si pasa esto, haga esto y avise a esta persona. Si no la puede llenar, una IA tampoco podrá.',
      sections: [
        {
          id: 'news',
          heading: 'Qué se anunció este mes',
          paragraphs: [
            'El 19 de noviembre de 2026, Amazon Web Services anunció la disponibilidad general de Resolutions en Amazon Connect, pensado para trabajo operativo de alto volumen como solicitudes de reembolso, disputas de transacciones, investigaciones de fraude y reclamos de seguros. Según el anuncio, un encargado puede describir un proceso en lenguaje común o subir los procedimientos operativos, y el servicio redacta un plan de trabajo. Luego, agentes de IA reúnen la información, aplican la política y actúan en las aplicaciones del negocio, mientras especialistas humanos atienden aprobaciones y excepciones. Cada acción y decisión queda registrada.',
            'La documentación trae tres detalles que importan más que el agente. Primero, al redactar el plan, el asistente hace preguntas de seguimiento sobre excepciones, reglas de decisión y umbrales de aprobación, y señala casos que el procedimiento no cubre; su propio ejemplo es qué hacer cuando un cliente no responde un correo después de dos días. Segundo, un plan no se puede publicar hasta resolver todos los pendientes. Tercero, una versión publicada no se puede cambiar: para modificarla hay que copiarla, editar la copia y publicarla como versión nueva.',
            'Leímos estos detalles en extractos de búsqueda del anuncio y la documentación de AWS; aws.amazon.com no abre desde nuestro entorno. El precio es por caso, en dólares, y la disponibilidad puede variar por región.'
          ]
        },
        {
          id: 'lean',
          heading: 'La lectura Lean: trabajo estandarizado y un sistema de gestión que crece',
          paragraphs: [
            'Vea lo que hace el servicio: pide el procedimiento, encuentra los huecos, no deja publicar con pendientes y mantiene una versión fija hasta que alguien apruebe una nueva. Esa es la disciplina del trabajo estandarizado en Lean: la mejor forma conocida hoy de hacer una tarea, escrita, seguida por todos y mejorada de manera deliberada, no cambiada por quien esté de turno. La herramienta no lo inventó; simplemente no puede funcionar sin eso.',
            'En un episodio de noviembre de 2026 del pódcast del Lean Enterprise Institute, "Growing Fast? Your Management System Needs to Keep Up", el presidente del LEI, Josh Howell, y Roberto Priolo, de Lean Global Network, entrevistan a Adam Rens, presidente y copropietario de Switchgear Power Systems, un fabricante de Wisconsin que diseña cada pedido a la medida. Según el resumen del episodio, la empresa enfrenta un aumento fuerte de la demanda y del tamaño de su planilla, y Lean se ha convertido en una forma de sostener ese crecimiento; la conversación también trata lo que cuesta cambiar los comportamientos de liderazgo. Leímos el resumen, no la transcripción completa.',
            'La conexión es directa: cuando una empresa suma gente rápido, lo que vivía en la cabeza de los fundadores deja de alcanzar. Sumar agentes de IA es lo mismo que sumar personas muy rápido. Si el procedimiento no estaba listo para una persona nueva, tampoco está listo para un agente.'
          ]
        },
        {
          id: 'no-tech',
          heading: 'Una técnica sin tecnología: la tabla de excepciones y el recuadro de versión',
          paragraphs: [
            'Tome el procedimiento que más repite su equipo y agréguele dos cosas en papel. Al final, una tabla de tres columnas: "Si pasa esto", "Haga esto", "Avise a". Llénela durante una semana: cada vez que alguien pregunte "¿y ahora qué hago?", esa pregunta se convierte en una fila. Arriba, un recuadro pequeño con el número de versión, la fecha, quién la aprobó y qué cambió. Quien cambia el procedimiento sin actualizar el recuadro no lo está siguiendo.',
            'Ejemplo sintético: una clínica ficticia en Heredia tramitaba reintegros de seguros con un procedimiento de dos páginas. En la primera semana, la tabla de excepciones juntó siete filas: factura con la cédula equivocada, paciente que no contesta, monto por encima del tope de la aseguradora, entre otras. Tres de esos casos explicaban la mayoría de los atrasos. El equipo eliminó dos desde el origen, revisando la cédula en recepción, y definió que los reintegros por encima de un monto fijo llevan las iniciales de la administradora. La versión 2 del procedimiento quedó una página más corta.',
            'Esa hoja sirve hoy con personas y mañana con cualquier herramienta. Y si algún día un agente ejecuta el proceso, la tabla ya le dice qué casos debe devolverle a una persona.'
          ]
        }
      ],
      discussion: [
        '¿Qué procedimiento de su negocio tiene excepciones que solo una persona sabe resolver?',
        'Si alguien cambiara hoy un procedimiento, ¿cómo se enteraría el resto del equipo?',
        '¿Qué casos debería devolver siempre a una persona un proceso automatizado?'
      ],
      sources: [
        { title: 'AWS — Amazon Connect launches Resolutions, an agentic solution for high-volume operational work (19 nov 2026)', url: 'https://aws.amazon.com/about-aws/whats-new/2026/11/amazon-connect-resolutions/' },
        { title: 'Documentación de AWS — Resolve operational work with Resolutions in Amazon Connect Customer', url: 'https://docs.aws.amazon.com/connect/latest/adminguide/resolutions.html' },
        { title: 'Lean Enterprise Institute — Growing Fast? Your Management System Needs to Keep Up (pódcast, nov 2026)', url: 'https://www.lean.org/the-lean-post/articles/growing-fast-your-management-system-needs-to-keep-up/' },
        { title: 'Lean Enterprise Institute — Standard Work for Lean Leaders: One of the Keys to Sustaining Performance Gains', url: 'https://www.lean.org/the-lean-post/articles/standard-work-for-lean-leaders-one-of-the-keys-to-sustaining-performance-gains/' }
      ]
    }
  },
  {
    id: 'rule-or-judgment-nov-2026',
    topic: 'operations',
    image: '/projects/crimson/facturas-desktop.webp',
    minutes: 5,
    published: '2026-11-24',
    en: {
      slug: 'rule-or-judgment-before-automating',
      title: 'Rule or judgment? Sort each decision before you automate it',
      summary: 'This month a cloud provider made it possible to build automations by describing a process in chat, with fixed steps and validations against rules you set. Its own guidance gives a simple test worth using with or without software: if you can write the rule down completely, it is a fixed step; if not, it needs judgment, and judgment needs a person or a measured review. A lean article from October adds how to tell whether the change actually worked.',
      takeaway: 'List the decisions in one process and mark each one R (the rule fits on a line) or J (it needs judgment). Automate or standardize the Rs first; for the Js, count how often the reviewer changes the proposed answer before trusting anyone, or anything, to decide alone.',
      sections: [
        {
          id: 'news',
          heading: 'What was announced this month',
          paragraphs: [
            'On November 20, 2026, Amazon Web Services announced that Flows in AWS Quick can now be built, run and refined through conversation: a user describes a process in chat and the service builds the automation, without code. According to the announcement, flows can coordinate agents, skills and tools; new deterministic steps keep results consistent, and validations check the output of each step against rules the user defines. Flows run on desktop, web and mobile, and support longer workflows and larger volumes of data. A day later, AWS added plugins that bundle agents, skills, connectors and flows for a specific role or task so teammates can find and reuse them.',
            'The useful part is in an AWS best-practices post for Quick Automate, a related product. Its rule of thumb: if you can write the rule down completely, use a deterministic step; leave agents for work that requires reading unstructured content or weighing context. It recommends one responsibility per agent (in its invoice example, reading the invoice, checking it against the purchase order and choosing an approval path are separate pieces), blocking human approval for high-stakes actions such as releasing a large payment, and a timeout or escalation path so a pending approval does not stall the whole process. It also suggests starting conservative and measuring how often reviewers change the proposed action before raising what is handled automatically.',
            'We read these details in search excerpts of the AWS announcement and blog; aws.amazon.com does not open from our environment. Figures and capabilities are as described by the provider.'
          ]
        },
        {
          id: 'lean',
          heading: 'The lean and Six Sigma reading: a change is an experiment',
          paragraphs: [
            'Separating rules from judgment is not new. In lean, whatever can be fully specified becomes standard work or error-proofing, so people spend their attention where it is needed. In Six Sigma, a decision that depends on who is on shift is a source of variation, and the first step is to measure it before trying to reduce it.',
            'In "Lean Was Always an Experiment" (October 19, 2026), Lean Enterprise Institute author Josh Howell argues that lean grew by trial and error, not as fixed doctrine, and gives a test for a real experiment: it starts from a standard, makes a prediction and checks both the process and the result. A change without those elements teaches nobody anything. We read the article in search excerpts; lean.org does not open from our environment.',
            'Apply that to automation: "we will automate approvals" is not an experiment. "Invoices under a set amount that match the purchase order will be approved without review, and we predict reviewers would have changed fewer than one in fifty of those" is. Measuring how often a person corrects the proposal is the same check the AWS post recommends, and the same one a Six Sigma team would run with a check sheet.'
          ]
        },
        {
          id: 'no-tech',
          heading: 'A no-technology technique: the R/J sheet and the correction tally',
          paragraphs: [
            'On one sheet, list every decision in a process: "approve?", "which supplier?", "is this urgent?". Next to each, write the rule in one line. If it fits completely, mark R. If you end up writing "it depends", mark J. The Rs become a checklist or a table anyone can apply, no system required. For every J, add two columns: who decides, and what happens if they have not answered within a set time (for example, after one business day it goes to the manager).',
            'Then, for two weeks, keep a check sheet next to each J: every time the reviewer approves a proposal as it came, one tick under "unchanged"; every time they change it, one tick under "changed" and a word on why. Those reasons often turn into new rules, so a J becomes an R. If after two weeks the "changed" column is almost empty, the review may have become a rubber stamp and it is worth asking whether it still protects anything.',
            'Synthetic example: a fictional distributor in Cartago listed nine decisions in its purchase process. Six were Rs, among them "if the supplier is on the approved list and the amount is under the limit, place the order". Of the three Js, the tally showed that the manager changed almost none of the price checks but did change a third of the "urgent" flags. The team wrote a definition of urgent, turned the price check into a rule and kept the review only where it was changing outcomes.'
          ]
        }
      ],
      discussion: [
        'Which decision in your process do people describe with "it depends"?',
        'Which approvals in your business have no deadline and no backup person?',
        'If you counted how often a reviewer changes what reaches them, what would you expect to find?'
      ],
      sources: [
        { title: 'AWS — Build more capable automations through chat with Flows in AWS Quick (Nov 20, 2026)', url: 'https://aws.amazon.com/about-aws/whats-new/2026/11/aws-quick-flows-automations-chat/' },
        { title: 'AWS — AWS Quick now supports plugins to bundle agents, skills, connectors and flows (Nov 2026)', url: 'https://aws.amazon.com/about-aws/whats-new/2026/11/aws-quick-plugins-bundle-agents-skills-connectors-flows/' },
        { title: 'AWS Machine Learning Blog — Best practices for building agentic automations with AWS Quick Automate', url: 'https://aws.amazon.com/blogs/machine-learning/best-practices-for-building-agentic-automations-with-amazon-quick-automate/' },
        { title: 'Lean Enterprise Institute — Lean Was Always an Experiment (Josh Howell, Oct 19, 2026)', url: 'https://www.lean.org/the-lean-post/articles/lean-was-always-an-experiment/' }
      ]
    },
    es: {
      slug: 'regla-o-criterio-antes-de-automatizar',
      title: '¿Regla o criterio? Clasifique cada decisión antes de automatizarla',
      summary: 'Este mes un proveedor de nube permitió construir automatizaciones describiendo el proceso en un chat, con pasos fijos y validaciones contra reglas que define el usuario. Su propia guía trae una prueba sencilla que sirve con o sin software: si la regla se puede escribir completa, es un paso fijo; si no, necesita criterio, y el criterio necesita una persona o una revisión medida. Un artículo Lean de octubre agrega cómo saber si el cambio realmente funcionó.',
      takeaway: 'Haga la lista de las decisiones de un proceso y marque cada una con R (la regla cabe en una línea) o C (necesita criterio). Estandarice o automatice primero las R; en las C, cuente cuántas veces quien revisa cambia la respuesta propuesta antes de confiar en que alguien, o algo, decida solo.',
      sections: [
        {
          id: 'news',
          heading: 'Qué se anunció este mes',
          paragraphs: [
            'El 20 de noviembre de 2026, Amazon Web Services anunció que los flujos (Flows) de AWS Quick ahora se pueden construir, ejecutar y ajustar conversando: el usuario describe un proceso en el chat y el servicio arma la automatización, sin programar. Según el anuncio, los flujos pueden coordinar agentes, habilidades y herramientas; nuevos pasos deterministas mantienen resultados consistentes, y las validaciones revisan la salida de cada paso contra reglas que define el usuario. Funcionan en escritorio, web y móvil, y admiten procesos más largos y más volumen de datos. Un día después, AWS sumó complementos (plugins) que agrupan agentes, habilidades, conectores y flujos para un puesto o tarea, de modo que el resto del equipo los encuentre y reutilice.',
            'Lo útil está en una guía de buenas prácticas de AWS para Quick Automate, un producto relacionado. Su regla práctica: si la regla se puede escribir completa, use un paso determinista; deje los agentes para el trabajo que exige leer contenido no estructurado o sopesar el contexto. Recomienda una sola responsabilidad por agente (en su ejemplo de facturas, leer la factura, compararla con la orden de compra y elegir la ruta de aprobación son piezas separadas), aprobación humana que detenga el proceso en acciones de alto riesgo como liberar un pago grande, y un plazo o una ruta de escalamiento para que una aprobación pendiente no frene todo. También sugiere empezar de forma conservadora y medir con qué frecuencia quien revisa cambia la acción propuesta antes de ampliar lo que se resuelve en automático.',
            'Leímos estos detalles en extractos de búsqueda del anuncio y del blog de AWS; aws.amazon.com no abre desde nuestro entorno. Las cifras y capacidades son las que describe el proveedor.'
          ]
        },
        {
          id: 'lean',
          heading: 'La lectura Lean y Six Sigma: un cambio es un experimento',
          paragraphs: [
            'Separar reglas de criterio no es nuevo. En Lean, lo que se puede especificar por completo se convierte en trabajo estandarizado o en un poka-yoke, para que las personas pongan su atención donde hace falta. En Six Sigma, una decisión que depende de quién esté de turno es una fuente de variación, y el primer paso es medirla antes de intentar reducirla.',
            'En "Lean Was Always an Experiment" (19 de octubre de 2026), Josh Howell, del Lean Enterprise Institute, sostiene que Lean creció a prueba y error, no como doctrina fija, y propone una prueba para un experimento real: parte de un estándar, hace una predicción y verifica tanto el proceso como el resultado. Un cambio sin esos elementos no le enseña nada a nadie. Leímos el artículo en extractos de búsqueda; lean.org no abre desde nuestro entorno.',
            'Llévelo a la automatización: "vamos a automatizar las aprobaciones" no es un experimento. "Las facturas por debajo de un monto fijo que coinciden con la orden de compra se aprueban sin revisión, y predecimos que quien revisa habría cambiado menos de una de cada cincuenta" sí lo es. Medir cuántas veces una persona corrige la propuesta es el mismo control que recomienda la guía de AWS, y el mismo que haría un equipo Six Sigma con una hoja de verificación.'
          ]
        },
        {
          id: 'no-tech',
          heading: 'Una técnica sin tecnología: la hoja R/C y el conteo de correcciones',
          paragraphs: [
            'En una hoja, anote cada decisión del proceso: "¿se aprueba?", "¿a qué proveedor?", "¿es urgente?". Al lado de cada una, escriba la regla en una línea. Si cabe completa, marque R. Si termina escribiendo "depende", marque C. Las R se convierten en una lista de verificación o una tabla que cualquiera puede aplicar, sin sistema. A cada C agréguele dos columnas: quién decide y qué pasa si no ha respondido en un plazo fijo (por ejemplo, después de un día hábil pasa a la gerencia).',
            'Luego, durante dos semanas, mantenga una hoja de verificación junto a cada C: cada vez que quien revisa aprueba la propuesta tal como llegó, una marca en "sin cambio"; cada vez que la cambia, una marca en "cambiada" y una palabra sobre el motivo. Esos motivos muchas veces se convierten en reglas nuevas, y una C pasa a ser R. Si después de dos semanas la columna "cambiada" está casi vacía, la revisión quizá se volvió un sello automático y vale la pena preguntarse si todavía protege algo.',
            'Ejemplo sintético: una distribuidora ficticia en Cartago anotó nueve decisiones en su proceso de compras. Seis eran R, entre ellas "si el proveedor está en la lista aprobada y el monto es menor al límite, se hace el pedido". De las tres C, el conteo mostró que la gerencia casi nunca cambiaba la revisión de precios, pero sí cambiaba una de cada tres marcas de "urgente". El equipo escribió una definición de urgente, convirtió la revisión de precios en regla y dejó la revisión solo donde estaba cambiando resultados.'
          ]
        }
      ],
      discussion: [
        '¿Qué decisión de su proceso describe la gente con un "depende"?',
        '¿Qué aprobaciones de su negocio no tienen plazo ni persona de respaldo?',
        'Si contara cuántas veces quien revisa cambia lo que le llega, ¿qué esperaría encontrar?'
      ],
      sources: [
        { title: 'AWS — Build more capable automations through chat with Flows in AWS Quick (20 nov 2026)', url: 'https://aws.amazon.com/about-aws/whats-new/2026/11/aws-quick-flows-automations-chat/' },
        { title: 'AWS — AWS Quick now supports plugins to bundle agents, skills, connectors and flows (nov 2026)', url: 'https://aws.amazon.com/about-aws/whats-new/2026/11/aws-quick-plugins-bundle-agents-skills-connectors-flows/' },
        { title: 'Blog de Machine Learning de AWS — Best practices for building agentic automations with AWS Quick Automate', url: 'https://aws.amazon.com/blogs/machine-learning/best-practices-for-building-agentic-automations-with-amazon-quick-automate/' },
        { title: 'Lean Enterprise Institute — Lean Was Always an Experiment (Josh Howell, 19 oct 2026)', url: 'https://www.lean.org/the-lean-post/articles/lean-was-always-an-experiment/' }
      ]
    }
  }
];
