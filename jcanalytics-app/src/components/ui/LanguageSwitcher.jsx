import { Globe2 } from 'lucide-react';
import { locale, t } from '../../i18n/locale';
import { resolveRoute, alternatePath } from '../../seo/routes';

export default function LanguageSwitcher() {
  const route = resolveRoute(window.location.pathname);
  const languagePath = (language) => alternatePath(route, language);
  // Real links work without JavaScript. With JS, retain where the visitor is: the section currently under the
  // header. A stale hash in the address (the menu link they arrived through, or #oferta after «Ver este
  // paquete») no longer wins over what is on screen; it sent people back to a section they had already left.
  // An open package detail (#hoja-…) or a pointed card (#paquete-…) is state, not position: it is kept as is.
  const visibleSection = () => {
    if (window.scrollY < 200) return '';
    const sections = [...document.querySelectorAll('main section[id]')];
    const current = sections.filter((section) => section.getBoundingClientRect().top <= 140).pop();
    return current && current.id !== 'top' ? `#${current.id}` : '';
  };
  const keepSection = (event) => {
    const { hash } = window.location;
    // The hash still tells where the visitor is while its target is on screen (the last section of a page can
    // never reach the header, so «the section under the header» would name the previous one).
    let target = null;
    try { target = hash.length > 1 ? document.getElementById(decodeURIComponent(hash.slice(1))) : null; } catch { /* malformed fragment */ }
    const box = target?.getBoundingClientRect();
    const onScreen = Boolean(box) && box.bottom > 80 && box.top < window.innerHeight * 0.75;
    const place = /^#(hoja|paquete)-/.test(hash) || onScreen ? hash : visibleSection() || (window.scrollY < 200 ? hash : '');
    event.currentTarget.href = `${languagePath(event.currentTarget.lang)}${window.location.search}${place}`;
  };
  return (
    <nav className="language-switcher" aria-label={t('Idioma del sitio', 'Website language')}>
      <Globe2 size={15} aria-hidden="true" />
      <a href={languagePath('en')} lang="en" hrefLang="en" onClick={keepSection} aria-current={locale === 'en' ? 'true' : undefined} aria-label="English">EN</a>
      <a href={languagePath('es')} lang="es" hrefLang="es" onClick={keepSection} aria-current={locale === 'es' ? 'true' : undefined} aria-label="Español">ES</a>
    </nav>
  );
}
