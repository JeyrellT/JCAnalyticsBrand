import { writeFile } from 'node:fs/promises';
import { content, SITE_URL } from '../src/seo/site.js';
import { servicePages } from '../src/content/services.js';

const knowledge = Object.fromEntries(['es', 'en'].map(language => [language, {
  name: 'JC Analytics',
  website: SITE_URL,
  location: 'Costa Rica',
  whatsapp: '+506 7033-0596',
  email: 'gerencia@jcanalytic.com',
  services: content[language].services.map(([name, description]) => ({ name, description })),
  faq: content[language].faq.map(([question, answer]) => ({ question, answer })),
  details: servicePages.map(service => ({
    title: service[language].title,
    summary: service[language].summary,
    sections: service[language].sections,
  })),
}]));
await writeFile(new URL('../../assistant-api/knowledge.json', import.meta.url), JSON.stringify(knowledge, null, 2) + '\n');
console.log('Assistant knowledge synchronized from the public services and FAQ.');
