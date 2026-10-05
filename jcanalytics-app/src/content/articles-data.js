// General business guidance. All illustrative scenarios are synthetic.
export const dataArticles = [
  {
    "id": "data-quality",
    "topic": "data",
    "image": "/images/journal/data.webp",
    "minutes": 5,
    "published": "2026-10-04",
    "en": {
      "slug": "data-quality-before-dashboards",
      "title": "Before the dashboard: can you trust the data?",
      "summary": "A practical guide to missing values, duplicate records and shared definitions before your team starts making decisions from a dashboard.",
      "takeaway": "Agree on what each record means, make uncertainty visible and assign someone to resolve it before relying on a total.",
      "sections": [
        {
          "id": "start-with-a-question",
          "heading": "Start with the question your business needs to answer",
          "paragraphs": [
            "A dashboard can make a number easy to see while leaving its meaning unclear. Before choosing charts, write the question behind the report. Are you deciding which requests need attention, whether stock needs replenishing, or how much work remains unfinished? Each question requires a different set of records and a different definition of complete information.",
            "Choose one question for your first review. Identify where the records come from, who creates them and who can explain exceptions. Keep a copy of the original material so that a correction can be checked against its source."
          ]
        },
        {
          "id": "define-the-record",
          "heading": "Agree on what one row represents",
          "paragraphs": [
            "A row might describe an order, an item within that order or a change in its status. Those are different things to count. Write the meaning in everyday language and confirm it with someone who uses the information. Also establish which date determines the reporting period and which status makes a record eligible.",
            "Pay attention to units. A box and an individual item need an agreed relationship. Amounts in different currencies need an explicit basis before they can be compared. A blank field needs a reason: it may mean unknown, not applicable or still pending. Replacing every blank with zero changes that meaning."
          ]
        },
        {
          "id": "check-the-basics",
          "heading": "Review a few essentials before building visuals",
          "paragraphs": [
            "You can begin this review in a spreadsheet. The important part is agreeing what to do when a check fails. A record should remain traceable while someone investigates it. Removing an unusual value merely because it looks inconvenient can erase the very issue the report should reveal.",
            "Microsoft documents quality, distribution and profile views in Power Query. Its profiling initially covers the first 1,000 rows unless you select the whole dataset. Check that scope before treating the preview as a review of all your records."
          ],
          "bullets": [
            "Confirm that required fields contain the information the decision needs.",
            "Check that dates, quantities and categories have a consistent meaning.",
            "Investigate repeated identifiers before deciding whether records are duplicates.",
            "Compare the reporting period and included statuses across source files.",
            "Record unresolved exceptions, their owner and the next review date."
          ]
        },
        {
          "id": "synthetic-example",
          "heading": "A synthetic example: why the order count changed",
          "paragraphs": [
            "Imagine a fictional business combining two order lists. One contains a row for each order; the other contains a row for each product ordered. Adding both row counts produces a misleading total, even though each file is internally correct.",
            "The useful conversation is about the unit being counted. The team agrees that its overview will count orders and that product detail will support a separate question. It documents which records belong in each view. This invented example illustrates a definition problem; it does not represent a client or a measured business result."
          ]
        },
        {
          "id": "keep-it-reliable",
          "heading": "Make quality part of the routine",
          "paragraphs": [
            "Once the first version is understandable, give the review a place in normal operations. Display the period covered and the latest successful update. If a source is missing, explain the gap where people read the report. Assign someone who can confirm whether the information is suitable for the decision at hand.",
            "Keep a short change record when definitions or source fields change. Revisit earlier comparisons if their meaning has changed. The practical outcome is a report whose assumptions people can explain, with a manageable list of open questions. That is a sound starting point for discussing a dashboard with your team."
          ]
        }
      ],
      "discussion": [
        "What does one record represent in the report you use most?",
        "Which missing field could change your next business decision?",
        "Who can resolve a discrepancy between two source files?"
      ],
      "sources": [
        {
          "title": "Microsoft Learn: data profiling tools in Power Query",
          "url": "https://learn.microsoft.com/en-us/power-query/data-profiling-tools"
        }
      ]
    },
    "es": {
      "slug": "calidad-de-datos-antes-del-dashboard",
      "title": "Antes del dashboard: ¿podés confiar en los datos?",
      "summary": "Una guía práctica para revisar datos faltantes, registros duplicados y definiciones antes de tomar decisiones con un dashboard.",
      "takeaway": "Acordá qué significa cada registro, hacé visible la incertidumbre y asigná quién la resuelve antes de confiar en un total.",
      "sections": [
        {
          "id": "start-with-a-question",
          "heading": "Empezá por la pregunta que necesita responder tu negocio",
          "paragraphs": [
            "Un dashboard puede hacer visible un número cuyo significado todavía es confuso. Antes de elegir gráficos, escribí la pregunta detrás del reporte. ¿Necesitás decidir qué solicitudes atender, si hace falta reponer inventario o cuánto trabajo sigue pendiente? Cada pregunta necesita registros distintos y una definición de qué información debe estar completa.",
            "Elegí una pregunta para la primera revisión. Identificá de dónde salen los registros, quién los crea y quién puede explicar las excepciones. Conservá una copia del material original para poder comprobar cualquier corrección contra su fuente."
          ]
        },
        {
          "id": "define-the-record",
          "heading": "Acordá qué representa una fila",
          "paragraphs": [
            "Una fila puede representar un pedido, un artículo de ese pedido o un cambio de estado. Son cosas distintas al momento de contar. Escribí su significado en palabras sencillas y confirmalo con alguien que use la información. Definí también qué fecha determina el período del reporte y qué estado permite incluir un registro.",
            "Revisá las unidades. Una caja y una unidad individual necesitan una relación acordada. Los importes en monedas diferentes requieren una base explícita para compararlos. Un campo vacío puede significar desconocido, no aplicable o todavía pendiente. Reemplazar todos los vacíos por cero cambia ese significado y puede alterar la interpretación del resultado."
          ]
        },
        {
          "id": "check-the-basics",
          "heading": "Revisá lo esencial antes de construir gráficos",
          "paragraphs": [
            "Podés comenzar esta revisión en una hoja de cálculo. Lo importante es acordar qué hacer cuando aparece una inconsistencia. El registro debe poder rastrearse mientras alguien lo investiga. Borrar un valor inusual solo porque resulta incómodo puede eliminar precisamente el problema que el reporte debía mostrar.",
            "Microsoft documenta vistas de calidad, distribución y perfil de columnas en Power Query. El perfilado comienza con las primeras 1.000 filas, salvo que seleccionés el conjunto completo. Revisá ese alcance antes de asumir que la vista previa cubre todos tus registros."
          ],
          "bullets": [
            "Confirmá que los campos obligatorios contienen lo necesario para decidir.",
            "Verificá que fechas, cantidades y categorías mantienen un significado consistente.",
            "Investigá los identificadores repetidos antes de decidir si hay duplicados.",
            "Compará períodos y estados incluidos entre los archivos de origen.",
            "Registrá las excepciones pendientes, su responsable y la próxima revisión."
          ]
        },
        {
          "id": "synthetic-example",
          "heading": "Ejemplo sintético: por qué cambió la cantidad de pedidos",
          "paragraphs": [
            "Imaginá un negocio ficticio que combina dos listas. La primera tiene una fila por pedido; la segunda, una fila por cada producto solicitado. Sumar las filas de ambos archivos produce un total engañoso, aunque cada lista sea correcta por separado.",
            "La conversación útil consiste en aclarar qué se está contando. El equipo acuerda que la vista general contará pedidos y que el detalle de productos responderá otra pregunta. Documenta qué registros corresponden a cada vista. Este ejemplo es inventado: ilustra un problema de definición y no representa un cliente ni un resultado comercial medido."
          ]
        },
        {
          "id": "keep-it-reliable",
          "heading": "Convertí la calidad en una rutina",
          "paragraphs": [
            "Cuando la primera versión sea comprensible, incorporá la revisión al trabajo habitual. Mostrá el período cubierto y la última actualización correcta. Si falta una fuente, explicá esa limitación donde las personas consultan el reporte. Asigná alguien que pueda confirmar si la información alcanza para la decisión que se quiere tomar.",
            "Llevá un registro breve cuando cambien las definiciones o los campos de origen. Revisá las comparaciones anteriores si su significado cambió. El resultado buscado es un reporte cuyos supuestos el equipo pueda explicar y una lista manejable de preguntas abiertas. Esa es una buena base para conversar sobre el dashboard que necesita tu negocio."
          ]
        }
      ],
      "discussion": [
        "¿Qué representa un registro en el reporte que más usás?",
        "¿Qué dato faltante podría cambiar tu próxima decisión?",
        "¿Quién puede resolver una diferencia entre dos archivos de origen?"
      ],
      "sources": [
        {
          "title": "Microsoft Learn: herramientas de perfilado de datos de Power Query",
          "url": "https://learn.microsoft.com/es-es/power-query/data-profiling-tools"
        }
      ]
    }
  },
  {
    "id": "decision-metrics",
    "topic": "data",
    "image": "/images/journal/data.webp",
    "minutes": 5,
    "published": "2026-10-04",
    "en": {
      "slug": "metrics-that-lead-to-decisions",
      "title": "Choose metrics that lead to a decision",
      "summary": "Connect business indicators to clear questions, shared definitions and a person who can take the next step.",
      "takeaway": "A useful indicator has a clear meaning, a comparable reference and an owner who knows what to investigate next.",
      "sections": [
        {
          "id": "name-the-decision",
          "heading": "Name the decision before the indicator",
          "paragraphs": [
            "Begin with something your team can actually decide. You might need to prioritize overdue requests, arrange coverage for a busy period or understand why work is taking longer. Write the decision in one sentence and identify who makes it. This helps you choose information that belongs in the conversation.",
            "Then ask what evidence would change that decision. A total number of completed requests may be useful, but it may leave out how old the remaining work is. Start with the smallest set of indicators that lets the team understand both the result and the unresolved work."
          ]
        },
        {
          "id": "write-the-definition",
          "heading": "Give every indicator a shared definition",
          "paragraphs": [
            "An indicator needs more than a familiar name. Two people may both say “completed work” while one counts an internal handoff and the other counts delivery to the customer. Resolve that difference before comparing teams or periods. A short written definition gives people something concrete to check when a number is disputed.",
            "Agree on how to handle cancellations, reopened requests and missing records. Keep the rule understandable to the people who enter the data. If the definition changes, make that change visible and explain whether older results can still be compared on the same basis."
          ],
          "bullets": [
            "State the business question and the person who uses the answer.",
            "Define the event being counted and the population it belongs to.",
            "Describe the period, exclusions and source of the information.",
            "Choose a comparison that uses the same definition and time basis.",
            "Identify who reviews an unexpected result and when."
          ]
        },
        {
          "id": "read-in-context",
          "heading": "Put movement in context",
          "paragraphs": [
            "A change in a number is a reason to investigate. Check whether the workload, mix of tasks or reporting coverage changed. A team handling more complex requests may take longer even when its work is sound. Comparing equivalent groups helps make the discussion more specific, but it still does not establish the cause by itself.",
            "Keep the reporting period and update status visible. When information is incomplete, say what is missing. Microsoft’s dashboard guidance recommends considering the audience and giving visuals context. Use that as a presentation check after the meaning of your indicators is agreed."
          ]
        },
        {
          "id": "synthetic-example",
          "heading": "A synthetic example: the backlog behind the total",
          "paragraphs": [
            "Consider a fictional service team whose weekly completion total stays steady. Its oldest open requests are getting older. Looking only at completions could leave the meeting with no clear next step. Adding the age of open work reveals a question: which requests are waiting, and what is blocking them?",
            "The team reviews the pending work, separates requests awaiting customer information and assigns a person to follow up. At the next review, it checks what changed and whether the action was appropriate. This is an invented scenario for explaining the reasoning; it does not describe a client or promise a performance improvement."
          ]
        },
        {
          "id": "close-the-loop",
          "heading": "Leave the review with a next step",
          "paragraphs": [
            "A useful review can end with an action, a request for more evidence or a documented decision to keep monitoring. Record the owner and the next review point. When an alert requires no response repeatedly, examine whether its definition, timing or relevance needs to change.",
            "Periodically ask the people using the report which indicators helped them make a decision. Remove or move information that serves a different audience. Keep explanations close to the numbers so that a new team member can follow the reasoning. A dashboard becomes easier to use when its purpose remains visible as the business evolves."
          ]
        }
      ],
      "discussion": [
        "Which recurring decision should your dashboard support?",
        "Could two people calculate your main indicator differently?",
        "What would your team do if that indicator changed tomorrow?"
      ],
      "sources": [
        {
          "title": "Microsoft Learn: tips for designing a Power BI dashboard",
          "url": "https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips"
        }
      ]
    },
    "es": {
      "slug": "indicadores-para-decidir",
      "title": "Elegí indicadores que ayuden a decidir",
      "summary": "Conectá los indicadores del negocio con preguntas claras, definiciones compartidas y una persona que pueda dar el siguiente paso.",
      "takeaway": "Un indicador útil tiene significado claro, una referencia comparable y alguien que sabe qué revisar después.",
      "sections": [
        {
          "id": "name-the-decision",
          "heading": "Definí la decisión antes del indicador",
          "paragraphs": [
            "Empezá por algo que tu equipo pueda decidir. Tal vez necesite priorizar solicitudes atrasadas, organizar la atención en un período de alta demanda o entender por qué el trabajo tarda más. Escribí la decisión en una frase e identificá quién la toma. Así podés elegir información que aporte a esa conversación.",
            "Después preguntá qué evidencia podría cambiar la decisión. La cantidad de solicitudes completadas puede ser útil, pero quizá deje fuera la antigüedad del trabajo pendiente. Comenzá con el conjunto más pequeño de indicadores que permita comprender tanto el resultado como lo que todavía necesita atención."
          ]
        },
        {
          "id": "write-the-definition",
          "heading": "Dale a cada indicador una definición compartida",
          "paragraphs": [
            "Un indicador necesita más que un nombre conocido. Dos personas pueden hablar de “trabajo completado” y referirse a momentos distintos: una cuenta el traspaso interno y otra la entrega al cliente. Resolvé esa diferencia antes de comparar equipos o períodos. Una definición breve permite revisar algo concreto cuando alguien cuestiona un número.",
            "Acordá cómo se tratan las cancelaciones, las solicitudes reabiertas y los registros incompletos. La regla debe ser comprensible para quienes cargan la información. Si cambia la definición, hacelo visible y explicá si los resultados anteriores todavía pueden compararse con el mismo criterio."
          ],
          "bullets": [
            "Escribí la pregunta del negocio y quién necesita la respuesta.",
            "Definí el evento que se cuenta y el conjunto al que pertenece.",
            "Indicá el período, las exclusiones y el origen de la información.",
            "Elegí una referencia con la misma definición y base temporal.",
            "Asigná quién revisa un resultado inesperado y en qué momento."
          ]
        },
        {
          "id": "read-in-context",
          "heading": "Interpretá el cambio con contexto",
          "paragraphs": [
            "Que un número cambie es una razón para investigar. Revisá si cambió la carga, la combinación de tareas o la cobertura del reporte. Un equipo que recibe solicitudes más complejas puede tardar más aunque trabaje correctamente. Comparar grupos equivalentes ayuda a precisar la conversación, pero por sí solo no demuestra la causa.",
            "Mantené visibles el período y el estado de actualización. Cuando la información esté incompleta, explicá qué falta. La guía de Microsoft para paneles recomienda considerar a la audiencia y aportar contexto a los gráficos. Usala como revisión de presentación después de acordar el significado de los indicadores."
          ]
        },
        {
          "id": "synthetic-example",
          "heading": "Ejemplo sintético: los pendientes detrás del total",
          "paragraphs": [
            "Imaginá un equipo de servicios ficticio cuya cantidad semanal de tareas completadas se mantiene estable. Al mismo tiempo, sus solicitudes más antiguas siguen acumulando espera. Revisar solamente las finalizadas podría dejar la reunión sin un siguiente paso claro. Agregar la antigüedad de los pendientes permite preguntar cuáles están detenidos y por qué.",
            "El equipo revisa esos pendientes, separa las solicitudes que esperan información del cliente y asigna una persona para dar seguimiento. En la siguiente reunión comprueba qué cambió y si la acción fue adecuada. Este escenario es inventado para explicar el razonamiento; no describe a un cliente ni promete una mejora de desempeño."
          ]
        },
        {
          "id": "close-the-loop",
          "heading": "Cerrá la revisión con un siguiente paso",
          "paragraphs": [
            "Una revisión útil puede terminar en una acción, una solicitud de más evidencia o una decisión documentada de seguir observando. Registrá el responsable y el momento de la próxima revisión. Si una alerta aparece repetidamente y nunca requiere respuesta, revisá si su definición, frecuencia o relevancia necesita cambiar.",
            "Cada cierto tiempo, preguntá a quienes usan el reporte qué indicadores les ayudaron a decidir. Retirá o trasladá la información destinada a otra audiencia. Dejá las explicaciones cerca de los números para que una persona nueva pueda seguir el razonamiento. El dashboard será más fácil de usar si su propósito sigue visible mientras cambia el negocio."
          ]
        }
      ],
      "discussion": [
        "¿Qué decisión recurrente debería apoyar tu dashboard?",
        "¿Dos personas podrían calcular de forma distinta tu indicador principal?",
        "¿Qué haría tu equipo si ese indicador cambiara mañana?"
      ],
      "sources": [
        {
          "title": "Microsoft Learn: sugerencias para diseñar un panel de Power BI",
          "url": "https://learn.microsoft.com/es-es/power-bi/create-reports/service-dashboards-design-tips"
        }
      ]
    }
  }
];
