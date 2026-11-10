// ============================================================================
//  src/content/categories.js
//  LAS CINCO CATEGORÍAS · un solo nombre y un solo orden en todo el sitio.
//
//  Antes cada lugar las llamaba distinto («Finanzas & BI» en el menú, «Finanzas
//  y dashboards» en el hero, «Dashboards y datos» en el pie) y las ordenaba a su
//  manera. Menú, hero, «Qué hacemos», pie, migas de las páginas de servicio y
//  datos estructurados leen de acá: una categoría se llama igual en todas partes
//  y siempre lleva a la misma página (auditoría de la portada, noviembre de 2026).
//
//  Sin dependencias del navegador: lo usan también el prerender y las pruebas.
// ============================================================================
import { servicePages } from './services.js';

// `key` identifica la categoría en el menú de celular (icono y detalle en Nav.jsx).
// `short` es la forma abreviada para la barra del menú, donde el espacio no alcanza; siempre es una
// abreviatura reconocible del mismo nombre («IA» por «Inteligencia artificial»), nunca otro nombre.
const DEFINITIONS = [
  { id: 'web-development', key: 'systems', name: { es: 'Webs y sistemas', en: 'Websites & systems' } },
  { id: 'process-automation', key: 'automation', name: { es: 'Automatización', en: 'Automation' } },
  { id: 'business-intelligence', key: 'finance', name: { es: 'Finanzas y dashboards', en: 'Finance & dashboards' } },
  { id: 'ai-integration', key: 'intelligence', name: { es: 'Inteligencia artificial', en: 'Artificial intelligence' }, short: { es: 'IA', en: 'AI' } },
  { id: 'digital-marketing', key: 'marketing', name: { es: 'Marketing', en: 'Marketing' } },
];

export const CATEGORIES = DEFINITIONS.map((definition) => {
  const page = servicePages.find((item) => item.id === definition.id);
  if (!page) throw new Error(`Category without a service page: ${definition.id}`);
  return { ...definition, short: definition.short ?? definition.name, page };
});

export const categoryById = (id) => CATEGORIES.find((item) => item.id === id);
export const categoryName = (id, language) => categoryById(id)?.name[language] ?? '';
