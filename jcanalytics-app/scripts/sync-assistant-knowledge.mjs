import { writeFile } from 'node:fs/promises';
import { content, SITE_URL } from '../src/seo/site.js';
import { servicePages } from '../src/content/services.js';
import { SERVICE_PRICING } from '../../portal/shared/service-pricing.js';

const knowledge = Object.fromEntries(['es', 'en'].map(language => [language, {
  name: 'JC Analytics',
  website: SITE_URL,
  location: 'Costa Rica',
  whatsapp: '+506 7033-0596',
  email: 'gerencia@jcanalytic.com',
  services: content[language].services.map(([name, description]) => ({ name, description })),
  faq: content[language].faq.map(([question, answer]) => ({ question, answer })),
  pricing: {
    currency: 'USD', tax_included: false,
    terms: language === 'es'
      ? 'Precios fijos por el alcance indicado. El total con IA reemplaza la base; no se suma a ella. Soporte mensual opcional, impuestos, licencias, consumos, preparación de información y adicionales aparte. Datos, contenidos y accesos listos. 30 días de corrección de defectos del alcance entregado.'
      : 'Fixed prices for the stated scope. The total with AI replaces the base; do not add it to the base. Optional monthly support, taxes, licenses, usage, information preparation and extras are separate. Data, content and access must be ready. 30 days of defect corrections within the delivered scope.',
    packages: Object.entries(SERVICE_PRICING).map(([key, price]) => ({
      key, name: language === 'es' ? price.label : price.label_en,
      base_usd: price.base_usd, total_with_ai_usd: price.with_ai_usd, ai_included: !!price.ai_included,
      support_monthly_usd: price.support_monthly_usd, support_hours_per_week: price.support_hours_per_week,
      scope: language === 'es' ? price.scope : price.scope_en,
      ai_scope: language === 'es' ? price.ai_scope : price.ai_scope_en,
      exclusions: language === 'es' ? price.exclusions : price.exclusions_en,
    })),
  },
  details: servicePages.map(service => ({
    title: service[language].title,
    summary: service[language].summary,
    sections: service[language].sections,
  })),
}]));
await writeFile(new URL('../../assistant-api/knowledge.json', import.meta.url), JSON.stringify(knowledge, null, 2) + '\n');
console.log('Assistant knowledge synchronized from the public services and FAQ.');
