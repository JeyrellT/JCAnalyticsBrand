// The URL is the source of truth: both languages remain shareable and crawlable.
export const locale = typeof window !== 'undefined' && /^\/es(?:\/|$)/.test(window.location.pathname) ? 'es' : 'en';
export const t = (es, en) => locale === 'es' ? es : en;
export const languagePath = (language) => language === 'es' ? '/es/' : '/';
