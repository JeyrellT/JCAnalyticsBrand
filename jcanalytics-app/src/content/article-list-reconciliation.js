// Original practical guide. Every example is synthetic; no client material is published.
export const reconciliationArticle = {
  id: 'list-reconciliation',
  topic: 'data',
  tool: 'list-reconciler',
  image: '/images/journal/data.webp',
  minutes: 8,
  published: '2026-10-04',
  en: {
    slug: 'compare-two-lists-without-false-matches',
    title: 'Compare two lists without false matches',
    summary: 'Find missing references, different amounts and repeated keys with a free local comparison tool, synthetic CSV examples and a practical Excel and Power Query walkthrough.',
    takeaway: 'Find the same reference first, then compare its amount and currency. If the reference repeats, keep every row and review the group before pairing anything.',
    sections: [
      {
        id: 'choose-the-reference',
        heading: 'Start with a reference that identifies the same record',
        paragraphs: [
          'You have two exports and want to know what changed. Sorting by amount seems quick, until several records have the same value. A total can agree while individual records are missing. This comparison makes differences visible without changing either source.',
          'Choose a reference that identifies the same record in both lists: an order number, document number or another shared identifier. Confirm that each row describes the same kind of thing and that both exports cover the intended period. A list of orders cannot be paired directly with a list of order items. If references are only unique within a branch or year, prepare a shared, unambiguous identifier before using this tool.'
        ]
      },
      {
        id: 'try-the-example',
        heading: 'Try the example: identical amounts, different records',
        paragraphs: [
          'Load the synthetic example above and select Compare lists. List A has seven rows; B has six. The result contains seven reference groups: two matches, two differences, one only in A, one only in B and one repeated reference. All records are synthetic.',
          'References 001 and 002 both have 125.00 USD in A. In B, 001 and 009 have that same amount. Reference 001 matches. Reference 002 remains only in A, while 009 remains only in B. Pairing 002 with 009 because both say 125.00 would invent a relationship.',
          'Reference 003 shows an amount difference. Reference 004 shows a currency difference even though its number is unchanged. Reference 005 repeats in A, so its entire group stays unpaired, including the row in B. Reference 006 demonstrates that an equal negative amount can match.'
        ]
      },
      {
        id: 'prepare-the-input',
        heading: 'Prepare three columns with an explicit format',
        paragraphs: [
          'Paste reference;amount;currency, one record per line. The optional header can use those English names or referencia;importe;moneda. Each list accepts up to 200 data rows and 40,000 characters. Blank lines are ignored. The tool accepts this limited semicolon format, without quoted fields; it is not a general CSV importer.',
          'Use a decimal dot and at most two decimal places. Negative values are valid, but grouping separators, scientific notation and more than twelve whole digits are rejected. A format error blocks the whole comparison and identifies its source line. Fix the source deliberately; replacing punctuation everywhere can change a value.'
        ],
        bullets: [
          'Keep identifiers such as 001 as text. Reference case matters: AB1 and ab1 remain different.',
          'Spaces around each field are trimmed; internal reference characters stay unchanged.',
          'Currency codes must contain three letters and become uppercase. The tool does not verify official currency codes or convert currencies.'
        ]
      },
      {
        id: 'read-the-result',
        heading: 'Read five outcomes without deleting evidence',
        paragraphs: [
          'The summary counts distinct references, not input rows. Open each exception with its original line numbers. A repeated reference may indicate a duplicated export, a split transaction or the wrong choice of key. Identical-looking rows do not settle that question.'
        ],
        bullets: [
          'Match: one row on each side, with equal amount and currency.',
          'Different: one row on each side, but the amount or currency differs.',
          'Only in A: the reference has no corresponding row in B.',
          'Only in B: the reference has no corresponding row in A.',
          'Repeated reference: either side contains it more than once. Every row remains visible; none is automatically selected or removed.'
        ]
      },
      {
        id: 'excel-preparation',
        heading: 'In Excel, preserve the references and separate repeats',
        paragraphs: [
          'Download the two examples. In Excel, use Data → From Text/CSV, select the semicolon delimiter and open Transform Data. Remove any automatic Changed Type step, then set reference and currency to Text. Microsoft documents importing identifiers as text to preserve leading zeros. Double-clicking a CSV can reinterpret them; changing the display later does not reliably recover lost information.',
          'For amount, choose Change Type → Using Locale, Fixed decimal number and English (United States). This locale matches the decimal dot in these example files; it is not a required setting for every source. Check that 125.00 remains one hundred twenty-five before continuing. Microsoft explains how locale controls text conversion.',
          'Before grouping, trim leading and trailing spaces from reference and currency; uppercase currency while preserving reference case. In a working copy of each query, select reference, then Group By with Count Rows. Filter counts greater than one. Microsoft documents these grouping operations. Keep those references in an exceptions list and exclude them from both working lists before merging. For the example, set aside every 005 row from A and B. Preserve the original queries and the excluded rows for review; no source record needs to be deleted.'
        ]
      },
      {
        id: 'power-query-merge',
        heading: 'Use a full outer merge on the unique references',
        paragraphs: [
          'Select one prepared query and choose Merge Queries. Pick the other query, select the reference column in each and choose Full outer. Expand the other table’s reference, amount and currency. Microsoft describes this join as retaining rows from both tables, including those without a partner. Keep approximate matching disabled.',
          'Retain both reference columns so you can see which side is absent. Compare amounts only after confirming a shared reference and currency. Treat a missing side as missing, not as a zero amount. Add a status column using the four rules above, then keep the repeated-reference exceptions alongside that result.',
          'Verify the example manually before repeating the process: 002 and 009 must remain separate; 004 must show a currency difference. If either condition fails, inspect the selected join columns and the field types before trusting a larger file.'
        ]
      },
      {
        id: 'review-and-export',
        heading: 'Turn the result into a short review queue',
        paragraphs: [
          'Download the report when you need to continue the review elsewhere. It contains one row per source record, with a stable status code, reference, source list and original line number. Repeated groups are not exported as invented pairs. Formula-like references receive a protective apostrophe; import the reference column as text to preserve its zeros.',
          'Give each open reference an owner and a question: confirm the export period, find the missing document or explain the differing value. Record the answer before changing an operational system. A match here only confirms the three supplied fields; it does not prove payment, document authenticity or correctness of either source.',
          'The web tool processes pasted text locally without sending or saving it. It does not perform partial payments, currency conversion, approximate matching or accounting entries. For larger files or ambiguous identities, agree on a stronger reference model and a reviewed workflow before automating the next step.'
        ]
      }
    ],
    discussion: [
      'Which reference identifies the same record uniquely in both of your exports?',
      'What should your team investigate when one reference appears more than once?',
      'Who can confirm the source evidence before a difference becomes a correction?'
    ],
    sources: [
      { title: 'Microsoft Support — Keeping leading zeros and large numbers', url: 'https://support.microsoft.com/en-us/excel/keeping-leading-zeros-and-large-numbers' },
      { title: 'Microsoft Learn — Data types and locale in Power Query', url: 'https://learn.microsoft.com/en-us/power-query/data-types' },
      { title: 'Microsoft Learn — Grouping or summarizing rows', url: 'https://learn.microsoft.com/en-us/power-query/group-by' },
      { title: 'Microsoft Learn — Full outer join', url: 'https://learn.microsoft.com/en-us/power-query/merge-queries-full-outer' }
    ]
  },
  es: {
    slug: 'comparar-dos-listas-sin-falsas-coincidencias',
    title: 'Comparar dos listas en Excel sin falsas coincidencias',
    summary: 'Encontrá referencias faltantes, importes distintos y claves repetidas con un comparador local gratuito, archivos CSV sintéticos y pasos prácticos para Excel y Power Query.',
    takeaway: 'Buscá primero la misma referencia y después compará importe y moneda. Si la referencia se repite, conservá todas las filas y revisá el grupo antes de vincular registros.',
    sections: [
      {
        id: 'choose-the-reference',
        heading: 'Empezá con una referencia que identifique el mismo registro',
        paragraphs: [
          'Tenés dos exportaciones y necesitás encontrar qué cambió. Ordenar por importe parece rápido, hasta que varios registros tienen el mismo valor. Un total puede coincidir aunque falten operaciones. Esta comparación muestra diferencias sin modificar los originales.',
          'Elegí una referencia que identifique el mismo registro en ambas listas: número de pedido, de documento u otro identificador compartido. Confirmá que cada fila represente lo mismo y que las exportaciones cubran el período previsto. Una lista de pedidos no se compara directamente con sus líneas de productos. Si una referencia solo es única dentro de una sucursal o año, prepará un identificador compartido sin ambigüedades antes de usar la herramienta.'
        ]
      },
      {
        id: 'try-the-example',
        heading: 'Probá el ejemplo: mismo importe, registros diferentes',
        paragraphs: [
          'Cargá el ejemplo sintético de arriba y presioná Comparar listas. A tiene siete filas y B tiene seis. El resultado reúne siete referencias: dos coincidencias, dos diferencias, una solo en A, una solo en B y una clave repetida. Todos los registros son sintéticos.',
          'Las referencias 001 y 002 tienen 125.00 USD en A. En B, las referencias 001 y 009 comparten ese importe. La 001 coincide. La 002 queda solo en A y la 009, solo en B. Vincular 002 con 009 porque ambas muestran 125.00 inventaría una relación.',
          'La referencia 003 presenta un importe diferente. La 004 presenta distinta moneda aunque el número coincida. La 005 se repite en A: todo el grupo queda sin emparejar, incluida su fila en B. La 006 demuestra que un importe negativo también puede coincidir.'
        ]
      },
      {
        id: 'prepare-the-input',
        heading: 'Prepará tres columnas con un formato explícito',
        paragraphs: [
          'Pegá referencia;importe;moneda, un registro por línea. El encabezado es opcional y también puede ser reference;amount;currency. Cada lista acepta hasta 200 filas de datos y 40.000 caracteres. Las líneas vacías se ignoran. Se admite este formato limitado con punto y coma, sin campos entre comillas; no es un importador general de CSV.',
          'Usá punto decimal y hasta dos decimales. Se aceptan negativos, pero se rechazan separadores de miles, notación científica y más de doce dígitos enteros. Un error de formato bloquea toda la comparación e indica la línea de origen. Corregí el dato conscientemente: reemplazar signos en todo el archivo puede cambiar valores.'
        ],
        bullets: [
          'Conservá identificadores como 001 en texto. Las mayúsculas importan: AB1 y ab1 siguen siendo referencias distintas.',
          'Se recortan espacios alrededor de cada campo; los caracteres internos de la referencia se conservan.',
          'La moneda debe tener tres letras y pasa a mayúsculas. La herramienta no verifica códigos oficiales ni convierte monedas.'
        ]
      },
      {
        id: 'read-the-result',
        heading: 'Interpretá cinco estados sin borrar evidencia',
        paragraphs: [
          'El resumen cuenta referencias distintas, no filas de entrada. Revisá cada excepción con sus números de línea. Una referencia repetida podría indicar una exportación duplicada, una operación dividida o una clave inadecuada. Que las filas parezcan idénticas no resuelve esa pregunta.'
        ],
        bullets: [
          'Coincidencia: una fila por lado, con el mismo importe y moneda.',
          'Diferencia: una fila por lado, pero cambia el importe o la moneda.',
          'Solo en A: la referencia no tiene una fila correspondiente en B.',
          'Solo en B: la referencia no tiene una fila correspondiente en A.',
          'Clave repetida: aparece más de una vez en cualquiera de las listas. Todas las filas quedan visibles; ninguna se selecciona ni elimina automáticamente.'
        ]
      },
      {
        id: 'excel-preparation',
        heading: 'En Excel, conservá las referencias y separá las repetidas',
        paragraphs: [
          'Descargá ambos ejemplos. En Excel, elegí Datos → Desde texto/CSV, seleccioná punto y coma como delimitador y abrí Transformar datos. Quitá cualquier paso automático Tipo cambiado y definí reference y currency como Texto. Microsoft documenta importar identificadores como texto para conservar ceros iniciales. Abrir el CSV con doble clic puede reinterpretarlos; cambiar su apariencia después no recupera de forma confiable la información perdida.',
          'Para amount, elegí Cambiar tipo → Usar configuración regional, Número decimal fijo e Inglés (Estados Unidos). Esta configuración interpreta el punto decimal de estos ejemplos; no es obligatoria para cualquier fuente. Comprobá que 125.00 siga representando ciento veinticinco antes de continuar. Microsoft explica cómo la configuración regional controla la conversión de texto.',
          'Antes de agrupar, recortá espacios al inicio y final de reference y currency; pasá currency a mayúsculas y conservá las de reference. En una copia de trabajo de cada consulta, seleccioná referencia y elegí Agrupar por con Contar filas. Filtrá los conteos mayores que uno. Microsoft documenta estas operaciones. Conservá esas referencias en una lista de excepciones y excluilas de ambas listas de trabajo antes de combinar. En el ejemplo, separá todas las filas 005 de A y B. Conservá las consultas originales y las filas apartadas para revisión; no hace falta borrar registros de origen.'
        ]
      },
      {
        id: 'power-query-merge',
        heading: 'Combiná por referencia con una unión externa completa',
        paragraphs: [
          'Seleccioná una consulta preparada y elegí Combinar consultas. Indicá la otra consulta, seleccioná referencia en ambas y elegí Externa completa. Expandí referencia, importe y moneda de la otra tabla. Microsoft describe esta unión como una forma de conservar filas de ambos lados, incluidas las que no tienen pareja. Mantené desactivada la coincidencia aproximada.',
          'Conservá ambas columnas de referencia para identificar qué lado falta. Compará importes después de confirmar referencia y moneda compartidas. Un lado ausente significa faltante, no importe cero. Agregá una columna de estado con las cuatro reglas anteriores y mantené las excepciones por referencia repetida junto a ese resultado.',
          'Comprobá manualmente el ejemplo antes de repetirlo: 002 y 009 deben seguir separadas; 004 debe mostrar distinta moneda. Si alguna condición falla, revisá las columnas elegidas para combinar y sus tipos de datos antes de confiar en un archivo mayor.'
        ]
      },
      {
        id: 'review-and-export',
        heading: 'Convertí el resultado en una lista breve de revisión',
        paragraphs: [
          'Descargá el reporte para continuar la revisión en otra herramienta. Incluye una fila por registro de origen, con código de estado estable, referencia, lista y línea original. Los grupos repetidos no se exportan como pares inventados. Las referencias que podrían iniciar una fórmula reciben un apóstrofo protector; importá referencia como texto para conservar sus ceros.',
          'Asigná a cada referencia pendiente un responsable y una pregunta: confirmar el período, encontrar el documento faltante o explicar el valor diferente. Registrá la respuesta antes de modificar el sistema. Una coincidencia solo confirma los tres campos suministrados; no prueba un pago, la autenticidad de un documento ni que las fuentes sean correctas.',
          'El comparador procesa el texto localmente, sin enviarlo ni guardarlo. No resuelve pagos parciales, conversiones de moneda, vínculos aproximados ni asientos contables. Para archivos mayores o identidades ambiguas, acordá una referencia más sólida y un procedimiento de revisión antes de automatizar el siguiente paso.'
        ]
      }
    ],
    discussion: [
      '¿Qué referencia identifica de forma única el mismo registro en ambas exportaciones?',
      '¿Qué debería investigar tu equipo cuando una referencia aparece varias veces?',
      '¿Quién puede confirmar la evidencia antes de convertir una diferencia en una corrección?'
    ],
    sources: [
      { title: 'Microsoft Support — Conservación de ceros iniciales y números grandes', url: 'https://support.microsoft.com/en-us/excel/keeping-leading-zeros-and-large-numbers' },
      { title: 'Microsoft Learn — Tipos de datos y configuración regional en Power Query', url: 'https://learn.microsoft.com/en-us/power-query/data-types' },
      { title: 'Microsoft Learn — Agrupar o resumir filas', url: 'https://learn.microsoft.com/en-us/power-query/group-by' },
      { title: 'Microsoft Learn — Unión externa completa', url: 'https://learn.microsoft.com/en-us/power-query/merge-queries-full-outer' }
    ]
  }
};
