import { articles, servicePages } from '../content/catalog.js';

// Spanish is the default language at the root; English lives under /en/.
export const homePath = (language) => language === 'es' ? '/' : '/en/';
export const journalPath = (language) => language === 'es' ? '/ideas/' : '/en/insights/';
export const articlePath = (article, language) => `${journalPath(language)}${article[language].slug}/`;
export const servicePath = (service, language) => `${language === 'es' ? '/servicios/' : '/en/services/'}${service[language].slug}/`;
export const routes = ['en', 'es'].flatMap(language => [
  { type: 'home', language, path: homePath(language) },
  { type: 'journal', language, path: journalPath(language) },
  ...articles.map(data => ({ type: 'article', language, path: articlePath(data, language), data })),
  ...servicePages.map(data => ({ type: 'service', language, path: servicePath(data, language), data })),
]);
export function resolveRoute(pathname = '/') {
  const clean = pathname === '/' ? '/' : `${pathname.replace(/\/+$/, '')}/`;
  return routes.find(route => route.path === clean);
}
export function alternatePath(route, language) {
  if (route?.type === 'article') return articlePath(route.data, language);
  if (route?.type === 'service') return servicePath(route.data, language);
  if (route?.type === 'journal') return journalPath(language);
  return homePath(language);
}
