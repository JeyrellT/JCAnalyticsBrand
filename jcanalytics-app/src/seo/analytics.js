import { locale } from '../i18n/locale';
import { WA_LINE } from '../components/site/links';

// Google Ads conversion "Clic WhatsApp" (Contact, primary, one per click, $10).
const ADS_CONVERSION = { send_to: 'AW-18237462818/5C2RCMSwvaIdEKKypvhD', value: 10, currency: 'USD' };
const CONVERSION_DEDUPE_MS = 3000;

// Measures intent, not a completed lead. Never send names, email addresses,
// free text or WhatsApp message contents to the existing Google tag.
export function trackContactClicks() {
  let lastConversion = 0;
  const track = (event) => {
    const link = event.target.closest?.('a[href]');
    const isContactForm = event.type === 'submit' && event.target.closest?.('#contacto');
    if (!link && !isContactForm) return;
    const href = link?.getAttribute('href') ?? '';
    const channel = isContactForm || href.startsWith('https://wa.me/') ? 'whatsapp' : href.startsWith('mailto:') ? 'email' : href.startsWith('tel:') ? 'phone' : null;
    if (!channel) return;
    // Meta Pixel: a completed contact form is a Lead; any other contact click is Contact.
    if (typeof window.fbq === 'function') {
      window.fbq('track', isContactForm ? 'Lead' : 'Contact', { content_name: channel, content_category: locale });
    }
    // OpenAI pixel: every WhatsApp click (or contact form) is the lead goal for ChatGPT Ads.
    if (channel === 'whatsapp' && typeof window.oaiq === 'function') {
      const eventId = window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
      window.oaiq('measure', 'lead_created', { customer_action: { channel } }, { event_id: eventId });
    }
    if (typeof window.gtag !== 'function') return;
    window.gtag('event', 'contact_click', {
      contact_channel: channel,
      site_language: locale,
      section_id: event.target.closest('section[id]')?.id ?? 'navigation',
      // Which of the two randomly assigned lines received the lead (a / b).
      ...(channel === 'email' ? {} : { contact_line: WA_LINE }),
    });
    if (channel !== 'whatsapp' || Date.now() - lastConversion < CONVERSION_DEDUPE_MS) return;
    lastConversion = Date.now();
    window.gtag('event', 'conversion', { ...ADS_CONVERSION, transport_type: 'beacon' });
  };
  document.addEventListener('click', track);
  document.addEventListener('submit', track);
  return () => { document.removeEventListener('click', track); document.removeEventListener('submit', track); };
}
