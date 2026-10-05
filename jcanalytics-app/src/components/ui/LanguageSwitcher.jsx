import { Globe2 } from 'lucide-react';
import { locale, t } from '../../i18n/locale';
import { resolveRoute, alternatePath } from '../../seo/routes';

export default function LanguageSwitcher() {
  const route = resolveRoute(window.location.pathname);
  const languagePath = (language) => alternatePath(route, language);
  // Real links work without JavaScript. With JS, retain the visitor's section.
  const keepSection = (event) => {
    event.currentTarget.href = `${languagePath(event.currentTarget.lang)}${window.location.search}${window.location.hash}`;
  };
  return (
    <nav className="language-switcher" aria-label={t('Idioma del sitio', 'Website language')}>
      <Globe2 size={15} aria-hidden="true" />
      <a href={languagePath('en')} lang="en" hrefLang="en" onClick={keepSection} aria-current={locale === 'en' ? 'true' : undefined} aria-label="English">EN</a>
      <a href={languagePath('es')} lang="es" hrefLang="es" onClick={keepSection} aria-current={locale === 'es' ? 'true' : undefined} aria-label="Español">ES</a>
    </nav>
  );
}
