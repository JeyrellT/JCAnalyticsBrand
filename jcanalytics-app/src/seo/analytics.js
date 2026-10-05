import { locale } from '../i18n/locale';

// Measures intent, not a completed lead. Never send names, email addresses,
// free text or WhatsApp message contents to the existing Google tag.
export function trackContactClicks() {
  const track = (event) => {
    const link = event.target.closest?.('a[href]');
    const isContactForm = event.type === 'submit' && event.target.closest?.('#contacto');
    if (!link && !isContactForm) return;
    const href = link?.getAttribute('href') ?? '';
    const channel = isContactForm || href.startsWith('https://wa.me/') ? 'whatsapp' : href.startsWith('mailto:') ? 'email' : href.startsWith('tel:') ? 'phone' : null;
    if (!channel || typeof window.gtag !== 'function') return;
    window.gtag('event', 'contact_click', {
      contact_channel: channel,
      site_language: locale,
      section_id: event.target.closest('section[id]')?.id ?? 'navigation',
    });
  };
  document.addEventListener('click', track);
  document.addEventListener('submit', track);
  return () => { document.removeEventListener('click', track); document.removeEventListener('submit', track); };
}
