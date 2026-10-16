import test from 'node:test';
import assert from 'node:assert/strict';
import { SERVICE_PRICING } from '../../portal/shared/service-pricing.js';
import { SERVICE_DEFAULTS, SERVICES as PORTAL_SERVICES } from '../../portal/shared/catalog.js';
import { SERVICES, SERVICE_ORDER, estimate } from '../src/data/cotizador.js';
import { formatRange } from '../src/data/currencies.js';

// Independent transcription of the approved visible tables / sheets (slides 7–18).
const approved = {
  excel_vba: [60, 165, 0, 0, 9],
  dashboard_inicial: [135, 270, 0, 0, 10],
  power_bi: [240, 420, 0, 0, 11],
  power_automate: [165, 560, 30, 2, 12],
  crm_inicial: [270, 770, 30, 2, 13],
  inventario_inicial: [390, 600, 30, 2, 14],
  chatbot_atencion: [180, 680, 40, 3, 15],
  pagina_web: [570, 770, 30, 2, 16],
  software_medida: [540, 1620, 40, 3, 17],
  asistente_ia_documental: [420, 420, 40, 3, 18],
};

test('all ten fixed packages match approved source amounts, scope and portal defaults', () => {
  assert.deepEqual(Object.keys(SERVICE_PRICING).sort(), Object.keys(approved).sort());
  for (const [key, [base, ai, support, hours, slide]] of Object.entries(approved)) {
    const pricing = SERVICE_PRICING[key];
    assert.deepEqual([pricing.base_usd, pricing.with_ai_usd, pricing.support_monthly_usd, pricing.support_hours_per_week], [base, ai, support, hours], key);
    assert.ok(pricing.source.slides.includes(slide), key);
    assert.ok(pricing.scope && pricing.scope_en && pricing.exclusions && pricing.ai_scope, key);
    assert.equal(SERVICE_DEFAULTS[key].price_from_usd, base, key);
    assert.equal(PORTAL_SERVICES[key], pricing.label, key);
    assert.equal(SERVICES[key].pricingMode, 'fixed', key);
    assert.equal(SERVICE_ORDER.filter(value => value === key).length, 1, key);
  }
});

test('fixed quotes select a total, keep support separate, and do not apply legacy size or urgency multipliers', () => {
  for (const [key, [base, ai, support, hours]] of Object.entries(approved)) {
    for (const includeAI of [false, true]) {
      const result = estimate({ service: key, includeAI, size: 1, complexityScore: 1, urgency: 'urgente' });
      const price = includeAI ? ai : base;
      assert.deepEqual(result.investUSD, { low: price, high: price }, key);
      assert.equal(result.supportMonthlyUSD, support, key);
      assert.equal(result.supportHoursPerWeek, hours, key);
      assert.equal(result.unitSuffix, '', key);
      assert.equal(result.aiIncluded, includeAI || key === 'asistente_ia_documental', key);
    }
  }
  assert.match(estimate({ service: 'excel_vba' }).delivery.display, /3–5/);
});

test('fixed USD amounts are exact: no range rounding from 570 to 600 or 165 to 170', () => {
  for (const price of [60, 135, 165, 570, 770, 1620]) {
    assert.equal(formatRange(price, price, 'USD').label, `$${price.toLocaleString('en-US')}`);
  }
  assert.equal(formatRange(570, 570, 'CRC').label.replace(/\D/g, ''), '293550');
});

test('unmapped lines retain their earlier estimates and recurring units', () => {
  const previous = { doc_generation: 40, analisis_tfg: 50, alteryx_knime: 65, fiscal_planilla: 150, video_edicion: 45, community_manager: 150, python_pipeline: 1200 };
  for (const [key, minimum] of Object.entries(previous)) {
    assert.equal(SERVICES[key].priceMin, minimum, key);
    assert.equal(SERVICE_PRICING[key], undefined, key);
    assert.ok(estimate({ service: key, size: 0, complexityScore: 0 }).investUSD.low >= minimum, key);
  }
  assert.equal(estimate({ service: 'community_manager' }).unit, 'mes');
  assert.equal(estimate({ service: 'video_edicion' }).unit, 'pieza');
  assert.equal(estimate({ service: 'unknown' }), null);
});
