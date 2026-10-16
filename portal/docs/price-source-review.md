# Tarifas: trazabilidad y criterio de aplicación

Los dos PowerPoint se leyeron sin modificarlos. La extracción completa y el desglose comercial de clientes se conservan localmente fuera del repositorio público. Este documento recoge únicamente las decisiones necesarias para interpretar el tarifario. Los importes del código están en **unidades mayores** (USD y CRC), no en centavos.

## Precios aplicados

Fuente: **JC_Analytics_Tarifas_Propias_Final (1).pptx**, tablas de las diapositivas 7–8 y fichas 9–18. Por instrucción del propietario se toman los precios fijos visibles de esas tablas y fichas. La opción con IA es un **total**, no un incremento que se suma a la base. USD sin impuestos.

| Clave | Base USD | Total con IA USD | Soporte USD/mes | Horas/semana | Ficha |
|---|---:|---:|---:|---:|---:|
| excel_vba | 60 | 165 | No aplica | — | 9 |
| dashboard_inicial | 135 | 270 | No aplica | — | 10 |
| power_bi | 240 | 420 | No aplica | — | 11 |
| power_automate | 165 | 560 | 30 | 2 | 12 |
| crm_inicial | 270 | 770 | 30 | 2 | 13 |
| inventario_inicial | 390 | 600 | 30 | 2 | 14 |
| chatbot_atencion | 180 | 680 | 40 | 3 | 15 |
| pagina_web | 570 | 770 | 30 | 2 | 16 |
| software_medida | 540 | 1.620 | 40 | 3 | 17 |
| asistente_ia_documental | 420 | 420, IA incluida | 40 | 3 | 18 |

`shared/service-pricing.js` conserva alcance, exclusiones, plazo, función de IA y adicionales de cada ficha. El alcance presupone datos, contenidos y accesos listos. La preparación adicional de información (diapositiva 22), las ampliaciones (fichas y diapositiva 23), voz y telefonía (21), licencias, alojamiento y consumo no forman parte del precio de implementación. Una función incluida en el paquete con IA no se vuelve a cobrar como adicional. Las fichas incluyen capacitación, guía y 30 días de corrección de defectos dentro del alcance; esto no equivale al plan de soporte recurrente.

Las líneas anteriores sin equivalencia clara —documentos por lote, tesis, Alteryx/KNIME, fiscal/planilla, pipeline Python, video, community manager, SaaS y otros— conservan sus importes y no se presentan como tarifas obtenidas de los documentos.

El portal distingue **tarifario de referencia** del precio operativo que puede ajustar el administrador. La migración de datos del servidor sincroniza las líneas documentadas; editar la referencia de código por sí solo no cambia registros ya guardados. Las conversiones del cotizador público siguen siendo referencias identificadas con su fecha, no cotizaciones cambiarias vigentes.

## Conflictos conservados, no sumados

- Las diapositivas 19–20 presentan incrementos de IA de 85, 100, 120, 130, 120, 145, 165, 145, 210 y 0 USD, en el orden de la tabla. No coinciden con los totales fijos de las fichas: por ejemplo, web 570 + 145 = 715, pero su total con IA aprobado es 770; software 540 + 210 = 750, pero su total es 1.620. No se usan esos incrementos para calcular los paquetes.
- Las notas de las fichas 9–17 contienen otros rangos de incremento: 200–400, 250–450, 300–600, 300–650, 300–600, 350–700, 400–850, 350–700 y 500–1.000 USD. Tampoco se aplican sobre los totales aprobados.
- La diapositiva 28 ilustra web 800 + IA 450 + preparación 200 = 1.450 USD; sin preparación, 1.250. Es un ejemplo inconsistente con la ficha 16 y no sustituye 570/770.
- La diapositiva 29 ilustra paquetes de reportes (200 + 300 + 300 = 800), web + IA (800 + 450 = 1.250) y CRM + formulario + IA (900 + 200 + 400 = 1.500). No se usan como tarifas nuevas.
- Las notas de la diapositiva 30 mencionan soporte de 90–150 USD/mes por hasta 2 horas **mensuales**, o 180–300 por 4 horas mensuales. Se conserva la indicación visible de las fichas: 30 o 40 USD/mes, con 2 o 3 horas **por semana**. Son frecuencias diferentes; el código no las mezcla.
- Las diapositivas 24–27 contienen precios externos fechados en el documento. Son referencias históricas; no se activan como tarifas vigentes de proveedores ni como costos comprobados sin verificación o captura explícita posterior.

## Valoración de un proyecto: referencia del caso, no costo empresarial

Fuente: **Desglose de precio con servicios.pptx**.

El documento presenta una valoración de servicios y un acuerdo comercial de un proyecto concreto. Su tarifa de venta por hora no es un costo de nómina o proveedor. Sus descuentos y pagos acordados no fijan precios genéricos del catálogo ni demuestran por sí solos ganancia o pérdida. Los importes en monedas distintas requieren un tipo de cambio explícito para compararse.

Para calcular rentabilidad se necesitan ingresos, costos reales y período de imputación. Estas valoraciones documentales no se registran como gastos pagados ni se usan por sí solas para afirmar utilidad.
