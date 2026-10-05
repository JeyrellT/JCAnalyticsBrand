import { dataArticles } from './articles-data.js';
import { experienceArticles } from './articles-experience.js';
import { intelligenceArticles } from './articles-intelligence.js';
import { reconciliationArticle } from './article-list-reconciliation.js';
import { safeRetriesArticle } from './article-safe-retries.js';
export { servicePages } from './services.js';
export const articles = [reconciliationArticle, safeRetriesArticle, ...dataArticles, ...experienceArticles, ...intelligenceArticles];
export const topics = {
  data: { en: 'Data & decisions', es: 'Datos y decisiones' },
  experience: { en: 'Digital experience', es: 'Experiencia digital' },
  operations: { en: 'Better operations', es: 'Mejor operación' },
  intelligence: { en: 'Applied intelligence', es: 'Inteligencia aplicada' },
};
