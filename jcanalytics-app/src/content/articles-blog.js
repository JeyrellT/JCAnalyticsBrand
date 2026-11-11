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
  }
];
