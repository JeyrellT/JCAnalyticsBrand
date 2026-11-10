import { useState } from 'react';
import { t } from '../../i18n/locale';
import { ArrowDown, ArrowRight, MessageCircle } from 'lucide-react';
import { shotSrcSet } from '../../data/shots';
import { CATEGORIES } from '../../content/categories';
import { Label, MaskLines, Reveal } from './primitives';
import { CATEGORY_LINKS, wa } from './links';
import { MESSAGES } from './messages';
import CaseMatcher from './CaseMatcher';
import { useDesktop } from '../../hooks/useDesktop';
import '../../styles/categories.css';

// ============================================================================
//  ¿Cuál es mi caso? · una tarjeta por categoría, escrita desde el problema de
//  quien compra. Cada tarjeta abre su página (ejemplos reales, qué incluye, qué
//  no y el precio). Nombre, orden y destino salen de content/categories.js, los
//  mismos del menú, el hero y el pie.
//
//  Auditoría de noviembre de 2026: la pregunta «¿Qué querés resolver?» vive solo
//  acá (antes se repetía en el hero), cada línea «Para…» nombra a una persona y
//  su situación, y quien no sabe cuál le toca arma su caso en una frase
//  (CaseMatcher) en vez de quedar frente a un botón de WhatsApp sin contexto.
// ============================================================================
const COPY = {
  'web-development': { title: t('Una web que vende y un sistema que ordena.', 'A website that sells and a system that organizes.'), who: t('Para negocios que venden, reservan o reciben pedidos en línea.', 'For businesses that sell, take bookings or receive orders online.') },
  'process-automation': { title: t('Lo que alguien repite cada semana, hecho solo.', 'What someone repeats every week, done on its own.'), who: t('Para equipos que copian y pegan entre Excel y correo.', 'For teams copying and pasting between Excel and email.') },
  'business-intelligence': { title: t('Tus números al día, sin armar el reporte a mano.', 'Your numbers up to date, without building the report by hand.'), who: t('Para gerencias y equipos de finanzas con datos en varios lugares.', 'For managers and finance teams with data in several places.') },
  'ai-integration': { title: t('IA para una tarea concreta de tu equipo.', 'AI for one specific task your team does.'), who: t('Para consultar documentos o clasificar información, siempre con revisión humana.', 'To query documents or classify information, always with human review.') },
  'digital-marketing': { title: t('Que más gente conozca tu negocio.', 'Help more people discover your business.'), who: t('Para comercios y emprendimientos: redes, contenido y anuncios en Meta.', 'For shops and small ventures: social media, content and Meta ads.') },
};
const CARDS = CATEGORIES.map((category, index) => ({
  ...COPY[category.id], id: category.id, name: CATEGORY_LINKS[index].label, href: CATEGORY_LINKS[index].href, image: category.page.image,
}));

const Card = ({ item, index, matched }) => {
  const portrait = item.image.includes('/marketing/');
  return (
    <Reveal as="li" delay={index * 0.05} className={`category-card ${matched ? 'category-card--match' : ''}`}>
      <a href={item.href} data-track-label={`${t('Categorías', 'Categories')} · ${item.name}`}>
        <span className={`category-card__image ${portrait ? 'category-card__image--portrait' : ''}`}><img src={item.image} srcSet={shotSrcSet(item.image)} sizes="(max-width: 767px) 96px, (max-width: 1199px) 30vw, 260px" alt="" width={portrait ? 720 : 1600} height={portrait ? 900 : 1000} loading="lazy" decoding="async" /></span>
        <span className="category-card__body">
          <span className="category-card__kicker">{matched ? t('Tu caso · ', 'Your case · ') : ''}{item.name}</span>
          <h3>{item.title}</h3>
          <p className="category-card__who">{item.who}</p>
          <span className="category-card__link">{t('Ver ejemplos y precio', 'See examples and price')} <ArrowRight size={16} aria-hidden="true" /></span>
        </span>
      </a>
    </Reveal>
  );
};

const Categories = () => {
  // En computadora el enlace de WhatsApp abre el formulario corto (ui/LeadDialog.jsx): el texto no promete WhatsApp.
  const desktop = useDesktop();
  const [match, setMatch] = useState(null);
  return (
  <section id="servicios" className="categories-section scroll-mt-24" aria-labelledby="categories-title">
    <div className="categories-container">
      <div className="categories-heading">
        <div>
          <Label>{t('¿Cuál es mi caso? / Qué hacemos', 'Which is my case? / What we do')}</Label>
          <h2 id="categories-title"><MaskLines lines={[t('¿Qué querés resolver?', 'What do you want to solve?'), <em key="page">{t('Elegí lo que más se parece.', 'Pick the closest match.')}</em>]} /></h2>
        </div>
        <Reveal delay={0.15} className="categories-intro">
          <p>{t('Cada categoría tiene su página con ejemplos reales, qué incluye, qué no y el precio.', 'Each category has its own page with real examples, what is included, what is not, and the price.')}</p>
        </Reveal>
      </div>
      <ul className="categories-grid" aria-label={t('Categorías de servicio', 'Service categories')}>
        {CARDS.map((item, index) => <Card key={item.id} item={item} index={index} matched={match === item.id} />)}
      </ul>
      <Reveal delay={0.1} className="categories-foot">
        <CaseMatcher onMatch={setMatch} />
        <div className="categories-foot__links">
          <a href={wa(MESSAGES.undecided)} target="_blank" rel="noreferrer" className="categories-foot__wa" data-need="Otro" data-track-label="Categorías · No sé cuál me toca"><MessageCircle size={16} aria-hidden="true" />{desktop ? t('O contanos tu caso y te orientamos', 'Or tell us your case and we’ll guide you') : t('O contanos tu caso por WhatsApp', 'Or tell us your case on WhatsApp')}</a>
          <a href="#paquetes" className="categories-foot__next" data-track-label="Categorías · Ver paquetes">{t('Ver paquetes con precio publicado', 'See packages with published pricing')} <ArrowDown size={15} aria-hidden="true" /></a>
        </div>
      </Reveal>
    </div>
  </section>
  );
};

export default Categories;
