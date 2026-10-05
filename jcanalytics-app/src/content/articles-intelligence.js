export const intelligenceArticles = [
  {
    id: 'human-review',
    topic: 'intelligence',
    image: '/images/journal/intelligence.webp',
    minutes: 5,
    published: '2026-10-04',
    en: {
      slug: 'human-review-in-ai',
      title: 'Human review that can change an AI answer',
      summary: 'A practical way to give reviewers the evidence, time and authority to correct an AI draft before someone relies on it.',
      takeaway: 'Define the decision, make its evidence visible and give the reviewer a clear way to pause when the answer cannot be verified.',
      sections: [
        {
          id: 'decision',
          heading: 'Start with the decision someone will make',
          paragraphs: [
            'Before adding an approval button, finish this sentence: after reading this draft, a person will decide whether to do what? Approving wording, confirming a quantity and authorizing an action are different jobs. Name the decision so everyone understands what a review actually covers.',
            'NIST’s AI Risk Management Framework 1.0 recommends defining distinct responsibilities for human and AI roles and for oversight. That is a useful reference when deciding who owns a review.',
            'For a small pilot, write down the reviewer, the material they need and what happens while they are unavailable. A draft that waits for attention should stay visibly pending.'
          ]
        },
        {
          id: 'evidence',
          heading: 'Put useful evidence beside the draft',
          paragraphs: [
            'Imagine reviewing a summary while its source is hidden in another system. Every check becomes a search task. Put the relevant passage, its date and the original question within reach. The reviewer should be able to compare a claim with the material that supposedly supports it.',
            'Keep the comparison small enough to complete. A short answer with three specific claims can be checked individually. A long answer that mixes facts, assumptions and suggestions creates more work. Separate those parts, and label missing information where it affects the conclusion. A polished sentence should still have to survive the same checks as a rough draft.'
          ]
        },
        {
          id: 'synthetic-example',
          heading: 'Try an awkward synthetic example',
          paragraphs: [
            'Synthetic example: a fictional shared workshop has a one-page guide for borrowing a projector. An AI drafts answers from that guide. All documents, rules and situations in this example are invented for illustration.',
            'Prepare three questions. One has an explicit answer in the guide. Another asks about a return time the guide never mentions. A third refers to an older guide with a conflicting instruction. Ask a reviewer to explain which passage supports each answer and which case needs clarification.',
            'This exercise tests whether the review is possible with the information on screen. If the reviewer must guess, change the materials or the task before expanding the pilot.'
          ]
        },
        {
          id: 'uncertainty',
          heading: 'Give uncertainty a clear next step',
          paragraphs: [
            'A reviewer needs useful choices: accept a supported draft, edit it, request missing information or stop the action. Make those choices understandable. If asking for clarification automatically sends the original answer anyway, the review cannot protect that decision.',
            'In the workshop example, the unanswered return-time question should remain unresolved until someone checks the rule. Record a short reason such as missing information or conflicting source. Avoid copying personal conversations into a quality log. Agree who receives unresolved cases, and make sure the reviewer has enough time and permission to use that route.'
          ]
        },
        {
          id: 'measure',
          heading: 'Count the work after generation',
          paragraphs: [
            'Measure how long a usable answer takes, including reading, checking and correcting it. Keep a simple account of drafts accepted, corrected and left unresolved. Those categories can reveal whether the tool helps with the chosen task or repeatedly transfers work to the reviewer. Record waiting time separately from active review time so a slow queue does not hide an otherwise useful draft.',
            'Repeat the synthetic exercise when the source material or the way the tool is used changes. Ask reviewers which claim was hardest to check and why. Use that answer to improve the next version. A useful first outcome may be a narrower task with clearer evidence, even if it produces fewer drafts.'
          ]
        }
      ],
      discussion: [
        'Which part of an AI answer would your team find hardest to verify?',
        'Can a reviewer pause the next action without needing an exception from someone else?',
        'What would you measure to know whether review is becoming easier?'
      ],
      sources: [
        {
          title: 'NIST — AI Risk Management Framework 1.0, GOVERN 3.2',
          url: 'https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf'
        }
      ]
    },
    es: {
      slug: 'revision-humana-en-ia',
      title: 'Una revisión humana que pueda cambiar la respuesta de la IA',
      summary: 'Cómo dar a quien revisa la evidencia, el tiempo y la autoridad para corregir un borrador de IA antes de que alguien actúe con él.',
      takeaway: 'Definí la decisión, poné su evidencia a la vista y dejá una forma clara de detener el proceso cuando la respuesta no se pueda comprobar.',
      sections: [
        {
          id: 'decision',
          heading: 'Empezá por la decisión que tomará una persona',
          paragraphs: [
            'Antes de agregar un botón de aprobación, completá esta frase: después de leer el borrador, una persona decidirá si hace qué. Aprobar una redacción, confirmar una cantidad y autorizar una acción son trabajos diferentes. Nombrá la decisión para que todos entiendan qué cubre la revisión.',
            'El marco AI RMF 1.0 de NIST recomienda definir responsabilidades distintas para las personas, la IA y su supervisión. Es una referencia útil al decidir quién se hace cargo de revisar.',
            'Para un piloto pequeño, anotá quién revisa, qué material necesita y qué sucede cuando no está disponible. Un borrador pendiente de atención debe conservar ese estado a la vista.'
          ]
        },
        {
          id: 'evidence',
          heading: 'Poné la evidencia junto al borrador',
          paragraphs: [
            'Imaginá que revisás un resumen y su fuente está escondida en otro sistema. Cada comprobación se convierte en una búsqueda. Dejá a mano el fragmento relevante, su fecha y la pregunta original. Así será posible comparar una afirmación con el material que supuestamente la respalda.',
            'Mantené la comparación en un tamaño manejable. Una respuesta breve con tres afirmaciones permite comprobarlas por separado. Un texto largo que mezcla hechos, suposiciones y sugerencias exige más trabajo. Separá esas partes y señalá la información faltante cuando afecte la conclusión. Una frase bien escrita también debe pasar por las comprobaciones del resto del borrador.'
          ]
        },
        {
          id: 'synthetic-example',
          heading: 'Probá un ejemplo sintético con dificultades',
          paragraphs: [
            'Ejemplo sintético: un taller compartido ficticio tiene una guía de una página para prestar un proyector. Una IA prepara respuestas a partir de esa guía. Todos los documentos, reglas y situaciones del ejemplo son inventados con fines ilustrativos.',
            'Prepará tres preguntas. Una tiene respuesta explícita en la guía. Otra consulta una hora de devolución que el documento nunca menciona. La tercera usa una versión anterior con una instrucción contradictoria. Pedile a alguien que explique qué fragmento respalda cada respuesta y qué caso necesita una aclaración.',
            'El ejercicio permite ver si es posible revisar con la información disponible en pantalla. Si la persona necesita adivinar, cambiá el material o acotá la tarea antes de ampliar el piloto.'
          ]
        },
        {
          id: 'uncertainty',
          heading: 'Dale un siguiente paso a la incertidumbre',
          paragraphs: [
            'Quien revisa necesita opciones útiles: aceptar un borrador respaldado, editarlo, pedir información o detener la acción. Hacé que esas opciones sean comprensibles. Si pedir una aclaración envía de todos modos la respuesta original, la revisión pierde su capacidad de proteger esa decisión.',
            'En el ejemplo del taller, la hora de devolución debe quedar pendiente hasta que alguien compruebe la regla. Registrá un motivo breve, como información faltante o fuente contradictoria. Evitá copiar conversaciones personales a un registro de calidad. Acordá quién recibe los casos pendientes y asegurá tiempo y permiso para usar esa salida.'
          ]
        },
        {
          id: 'measure',
          heading: 'Contá el trabajo que sigue a la generación',
          paragraphs: [
            'Medí cuánto tarda una respuesta utilizable, incluyendo su lectura, comprobación y corrección. Llevá una cuenta sencilla de borradores aceptados, corregidos y pendientes. Esas categorías ayudan a observar si la herramienta facilita la tarea elegida o traslada trabajo repetidamente a quien revisa. Medí la espera por separado para entender si el atraso está en la tarea o en su atención.',
            'Repetí el ejercicio sintético cuando cambie la fuente o la manera de usar la herramienta. Preguntá qué afirmación costó más comprobar y por qué. Usá esa respuesta para mejorar la siguiente versión. Un primer resultado útil puede ser una tarea más acotada y con evidencia más clara, aunque produzca menos borradores.'
          ]
        }
      ],
      discussion: [
        '¿Qué parte de una respuesta de IA sería más difícil de comprobar para tu equipo?',
        '¿Puede quien revisa detener la siguiente acción sin pedir una excepción a otra persona?',
        '¿Qué medirías para saber si la revisión se está volviendo más sencilla?'
      ],
      sources: [
        {
          title: 'NIST — AI Risk Management Framework 1.0, GOVERN 3.2',
          url: 'https://nvlpubs.nist.gov/nistpubs/ai/nist.ai.100-1.pdf'
        }
      ]
    }
  },
  {
    id: 'first-automation',
    topic: 'operations',
    image: '/images/journal/systems.webp',
    minutes: 5,
    published: '2026-10-04',
    en: {
      slug: 'choosing-your-first-automation',
      title: 'How to choose your first useful automation',
      summary: 'Choose a repeated task with understandable inputs, a result you can check and a practical way to handle exceptions.',
      takeaway: 'Start with one observable problem, test a small reversible step and measure the effort required to reach a usable result.',
      sections: [
        {
          id: 'problem',
          heading: 'Describe the recurring inconvenience',
          paragraphs: [
            'Write the problem as something another person could observe: every week, someone copies the same information into a report and then checks it again. Add who does the work, what they receive and what they need to produce. This gives a discussion about automation a concrete starting point.',
            'Microsoft’s automation guidance recommends considering procedural tasks, their continuing value and the effort required to maintain them. It also recognizes that a workflow can retain human decisions while automating other steps.',
            'List a few candidates from ordinary work. For each, ask someone who performs it to describe the most recent difficult case. That conversation often exposes the real task.'
          ]
        },
        {
          id: 'inputs',
          heading: 'Check whether the inputs are understandable',
          paragraphs: [
            'Take a fictional sample of the information the task receives. Can two people explain each field in the same way? Does an empty value mean zero, unknown or still pending? Resolve those differences before trying to move the information automatically.',
            'Choose an initial boundary you can explain in one sentence. For example, collect completed forms into a draft summary. Keep incomplete forms in a visible review queue. Write down which inputs belong in the pilot and which require a person. The boundary makes it easier to recognize when the automation encounters a case it cannot finish.'
          ]
        },
        {
          id: 'synthetic-example',
          heading: 'Rehearse a small synthetic task',
          paragraphs: [
            'Synthetic example: a fictional training room uses three identical checklists to record chairs, markers and cables. Someone combines them into a weekly readiness report. All materials and situations described here are invented; they do not represent a customer or a measured result.',
            'A first pilot could prepare that report as a draft. Include one complete checklist, one with a missing date and one submitted twice. Decide beforehand what the draft should contain and what should require attention. Add a conflicting count and check that a person can find the disagreement.',
            'This creates a small, inspectable result. It also gives the team concrete examples for explaining what the automation is allowed to do.'
          ]
        },
        {
          id: 'exceptions',
          heading: 'Make unfinished work easy to find',
          paragraphs: [
            'An exception needs an owner and a visible next step. In the training-room example, the missing date should lead to a request for clarification. It should remain distinguishable from a completed entry. The person reviewing the draft needs enough context to resolve the issue without starting the whole task again.',
            'Try interrupting the rehearsal and running it again. Check whether a repeated input creates a duplicate result. Agree how to discard a draft and return to the existing manual task. Keep the original test materials available so a confusing result can be compared with what went in.'
          ]
        },
        {
          id: 'evaluation',
          heading: 'Compare the complete effort',
          paragraphs: [
            'Record the time spent preparing inputs, reviewing the result and fixing exceptions. Compare it with the same task performed manually on equivalent synthetic material. Note the quality differences too: a faster report that still requires a full recount may offer little practical help.',
            'Ask the person doing the work whether the draft is easier to understand and correct. Include the effort of keeping the automation working when a form changes. Use those observations to choose the next step: continue the pilot, narrow it, improve the inputs or stop. A first automation earns a wider role through evidence from the task it actually handles.'
          ]
        }
      ],
      discussion: [
        'Which repeated task has a result that your team can verify without guesswork?',
        'What exception would make that task a poor starting point today?',
        'What evidence would justify expanding the pilot or ending it?'
      ],
      sources: [
        {
          title: 'Microsoft Learn — Recommendations for implementing automation',
          url: 'https://learn.microsoft.com/en-us/power-platform/well-architected/operational-excellence/automate-tasks'
        }
      ]
    },
    es: {
      slug: 'elegir-la-primera-automatizacion',
      title: 'Cómo elegir una primera automatización útil',
      summary: 'Elegí una tarea repetida con entradas comprensibles, un resultado comprobable y una forma práctica de atender las excepciones.',
      takeaway: 'Empezá por un problema observable, probá un paso pequeño y reversible, y medí el esfuerzo necesario para obtener un resultado utilizable.',
      sections: [
        {
          id: 'problem',
          heading: 'Describí la dificultad que se repite',
          paragraphs: [
            'Escribí el problema como algo que otra persona pueda observar: cada semana alguien copia la misma información en un reporte y luego vuelve a comprobarla. Agregá quién hace el trabajo, qué recibe y qué necesita producir. Así la conversación sobre automatización tendrá un punto de partida concreto.',
            'La guía de automatización de Microsoft recomienda considerar tareas con pasos definidos, su utilidad sostenida y el esfuerzo de mantenimiento. También reconoce que un flujo puede conservar decisiones humanas mientras automatiza otros pasos.',
            'Hacé una lista breve de tareas candidatas. Para cada una, pedile a quien la realiza que describa el último caso difícil. Esa conversación suele aclarar qué trabajo hace falta resolver.'
          ]
        },
        {
          id: 'inputs',
          heading: 'Comprobá que las entradas se entiendan',
          paragraphs: [
            'Tomá una muestra ficticia de la información que recibe la tarea. ¿Dos personas pueden explicar cada campo del mismo modo? ¿Un valor vacío significa cero, desconocido o pendiente? Resolvé esas diferencias antes de intentar mover la información automáticamente.',
            'Elegí un alcance inicial que puedas explicar en una frase. Por ejemplo, reunir formularios completos en un borrador de resumen. Dejá los incompletos en una lista visible de revisión. Anotá qué entradas participan en el piloto y cuáles requieren una persona. Ese límite ayuda a reconocer cuándo la automatización encuentra un caso que no puede terminar.'
          ]
        },
        {
          id: 'synthetic-example',
          heading: 'Ensayá una tarea sintética pequeña',
          paragraphs: [
            'Ejemplo sintético: una sala de capacitación ficticia usa tres listas iguales para registrar sillas, marcadores y cables. Alguien las reúne en un reporte semanal de disponibilidad. Los materiales y situaciones de este ejemplo son inventados; no representan a un cliente ni un resultado medido.',
            'Un primer piloto podría preparar ese reporte como borrador. Incluí una lista completa, otra sin fecha y otra enviada dos veces. Acordá antes qué debe contener el borrador y qué necesita atención. Agregá un conteo contradictorio y comprobá que una persona pueda encontrar la diferencia.',
            'Así obtenés un resultado pequeño que se puede inspeccionar. También tenés ejemplos concretos para explicar qué acciones tiene permitido realizar la automatización.'
          ]
        },
        {
          id: 'exceptions',
          heading: 'Dejá a la vista el trabajo pendiente',
          paragraphs: [
            'Una excepción necesita responsable y siguiente paso. En el ejemplo de la sala, la fecha faltante debería llevar a pedir una aclaración. Ese registro debe distinguirse de uno completo. Quien revisa el borrador necesita contexto suficiente para resolver el problema sin comenzar toda la tarea de nuevo.',
            'Probá interrumpir el ensayo y ejecutarlo otra vez. Comprobá si una entrada repetida produce un resultado duplicado. Acordá cómo descartar un borrador y volver a la tarea manual existente. Conservá el material original de prueba para comparar un resultado confuso con la información que recibió el proceso.'
          ]
        },
        {
          id: 'evaluation',
          heading: 'Compará el esfuerzo completo',
          paragraphs: [
            'Anotá el tiempo de preparar las entradas, revisar el resultado y resolver excepciones. Comparalo con la misma tarea hecha manualmente sobre material sintético equivalente. Registrá también las diferencias de calidad: un reporte más rápido que exige volver a contar todo puede aportar poca ayuda práctica.',
            'Preguntale a quien hace el trabajo si el borrador es más fácil de entender y corregir. Incluí el esfuerzo de mantener la automatización cuando cambia un formulario. Usá esas observaciones para continuar el piloto, acotarlo, mejorar las entradas o detenerlo. La primera automatización se gana un alcance mayor con evidencia de la tarea que realmente resuelve.'
          ]
        }
      ],
      discussion: [
        '¿Qué tarea repetida tiene un resultado que tu equipo pueda comprobar sin adivinar?',
        '¿Qué excepción haría que esa tarea fuera un mal comienzo hoy?',
        '¿Qué evidencia justificaría ampliar el piloto o darlo por terminado?'
      ],
      sources: [
        {
          title: 'Microsoft Learn — Recomendaciones para implementar la automatización',
          url: 'https://learn.microsoft.com/en-us/power-platform/well-architected/operational-excellence/automate-tasks'
        }
      ]
    }
  }
];
