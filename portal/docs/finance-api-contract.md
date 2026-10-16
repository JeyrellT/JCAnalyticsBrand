# Finanzas operativas y anticipos de utilidad

Contrato: importes enteros en unidades menores. Resúmenes empresariales en CRC; repartos en la moneda de la inversión. Sólo admin escribe; socios leen. Inversionistas no acceden al libro empresarial.

## Libro

- `GET /api/finance/overview?year=2026`: `{year,currency:'CRC',totals,months,services,investments,options}`. Totals: `revenue_collected_crc,expenses_incurred_crc,expenses_paid_crc,unpaid_expenses_crc,net_profit_crc,cash_operating_crc`. Months suma `month`; servicios `key,name`; inversiones `id,name`. Options: `services:[{key,name}],projects:[{id,name,service}],investments:[{id,name,category,currency,is_campaign}],categories:[{key,label}]`.
- `GET /api/finance/entries?year=&kind=`: `{entries}`.
- `POST /api/finance/entries`; `PATCH /api/finance/entries/:id`: `{kind:'revenue'|'expense',category,amount,currency,fx_rate?,date,paid,paid_date?,description,reference?,service_key?,project_id?,investment_id?,allocations?}`. Revenue representa cobro real y siempre paid=true. Expense representa costo incurrido; paid=false distingue la cuenta por pagar. Para pagos parciales se registran filas separadas. USD requiere tipo de cambio guardado. Opcional allocations: `[{amount,service_key?,project_id?,investment_id?}]`, suma exactamente amount; por defecto una fila con las dimensiones superiores. Respuesta `{entry}`, con `id,amount_crc,status:'active'|'void',allocations[].amount_crc`.
- `POST /api/finance/entries/:id/void {reason}`. Los períodos con repartos registrados o cerrados no se reescriben; correcciones se registran en un período abierto.

Categorías: `sale,ads,delivery,labor,software,overhead,tax,refund,other`. Las dimensiones de servicio/proyecto/campaña son vistas del mismo importe, no cargos adicionales. Capital aportado y capital devuelto no son ventas ni gastos.

## Costeo planificado

- `GET /api/finance/costing`: `{plans,reference_prices}`.
- `POST /api/finance/costing`; `PATCH /api/finance/costing/:id`: `{name,service_key,currency,units,price_per_unit,margin_bps,costs:[{label,category,amount}]}`. units entero positivo, margin_bps 0..9500. Los costos son totales del trabajo, no por unidad. Respuesta `{plan}`.
- Plan agrega cálculos del servidor `total_cost,unit_cost,suggested_unit_price,projected_revenue,projected_profit,actual_margin_bps`. No entra en utilidad real. Reference_prices toma la fuente aprobada `shared/service-pricing.js`.

## Anticipos y capital

La política es por campaña (investment.category meta_ads/google_ads), no toda la empresa. El 20% es participación en utilidad anual, no tasa sobre capital ni promesa mensual.

- `PUT /api/finance/policies/:investmentId`: `{year,configured:true,rate_bps:2000,beneficiary_ids:[id],reserve_amount,costs_reviewed_through,fx_rate?}` -> `{policy}`. Beneficiarios explícitos obligatorios: nunca se asume que todos los socios participan del mismo acuerdo. Tasa propuesta2000; admin puede configurar1..10000 según acuerdo. Para USD, fx_rate fija conversión CRC/moneda del reparto. Configuración y revisión de costos explícitas del admin.
- `GET /api/finance/distributions/preview?investment_id=&month=YYYY-MM&profit_amount=&capital_amount=` -> `{investment:{id,name,currency},year,month,cutoff_date,policy,totals,partners,payments,preview_token,blockers,warnings}`. Montos opcionales: utilidad disponible completa y capital0 por defecto.
- Policy: `configured,rate_bps,reserve_amount,costs_reviewed_through,closed_at,fx_rate`.
- Totals: `revenue_collected,expenses_incurred,net_profit,annual_pool,annual_unassigned_pool,profit_reserved,profit_available,profit_unsettled,overpaid,operating_cash,capital_available,cash_available`. `profit_unsettled` conserva el derecho sin liquidar aunque falte caja; `profit_available` limita el envío a la caja estimada.
- Partners: `id,name,color,capital_contributed,capital_returned,outstanding_capital,capital_reserved,profit_entitlement,profit_reserved,profit_available,overpaid`.
- Payments: `partner_id,name,profit_amount,capital_amount,total`. Blockers/warnings: `[{code,message}]`.
- `POST /api/finance/distributions`: `{investment_id,month,date,message,reference?,profit_amount,capital_amount,preview_token,idempotency_key,acknowledge_sent:true}` -> `{distribution,movements}`. Registra un envío que el admin declara realizado; no transfiere dinero. Capital y utilidad generan movimientos separados pendientes de confirmación real. Token de vista previa detecta cambios; clave idempotente evita duplicados.
- `GET /api/finance/distributions?investment_id=&year=` -> `{distributions}`.
- `POST /api/finance/policies/:investmentId/close {year,reason}` -> `{policy,adjustment}`. Sólo año terminado; exige liquidar el ajuste final y confirmar retornos pendientes u objetados, incluidos los históricos clasificados. Snapshot definitivo sin sobrescribir pagos; movimientos incluidos no se pueden anular después del cierre. Sobrepago queda como ajuste a compensar, nunca cobro automático.

Registro de anticipos sólo para meses calendario terminados. El pool es `20% * max(0,resultado YTD - reserva)`; pérdidas arrastran dentro del año. Se deducen anticipos confirmados, pendientes y objetados hasta anulación. Capital-días se calcula por cada mes (incluye sólo capital confirmado y descuenta devoluciones de principal), con pesos históricos congelados: financiar tarde no da participación en ganancias previas. Retornos sin clasificar impiden calcular principal pendiente y nuevos repartos hasta aclararlos. Aportes nuevos no se consideran ingresos disponibles para utilidad.

## Compatibilidad y privacidad

Los meses positivos sin capital elegible generan una bolsa sin asignar: `annual_unassigned_pool`. No pasa a beneficiarios futuros. Las pérdidas y reservas reducen proporcionalmente esa bolsa y los créditos de cada persona. El aviso `profit_without_participation` explica por qué esa parte no está disponible.

`movement.return_kind`: `capital|profit|mixed|unclassified`; lo antiguo queda unclassified. Componentes: `return_capital_amount,return_profit_amount`. `POST /api/movements/:id/classify {capital_amount,profit_amount,reason}` sólo admin clasifica un retorno histórico una vez, preservando monto, fecha y estado; suma exactamente el original y deja auditoría. `returned`/MOIC/TIR conservan su interpretación histórica de flujos agregados. Métricas añaden `capital_returned,profit_returned,unclassified_returned,outstanding_capital`; último null cuando hay retornos confirmados sin clasificar. Portfolio usa sufijo `_crc`.

Detalle inversionista añade `annual_profit_share:{year,rate,policy_configured,costs_reviewed_through,own_profit_confirmed,own_profit_reserved,own_entitlement,own_available,own_overpaid}`. No incluye clientes, facturas, otros beneficiarios ni costos individuales.

Errores: validación400 `{error:'validation',field,message}`; permisos403; conflictos409 `closed_period,stale_preview,policy_not_configured,payout_exceeds_available`. Un blocker incluye explicación legible; nunca se sustituye un dato faltante por una rentabilidad ficticia.
