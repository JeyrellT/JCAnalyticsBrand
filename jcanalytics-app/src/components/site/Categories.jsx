import { t, locale } from '../../i18n/locale';
import { ArrowDown, ArrowUpRight, MessageCircle } from 'lucide-react';
import { servicePages } from '../../content/catalog';
import { servicePath } from '../../seo/routes';
import { shotSrcSet } from '../../data/shots';
import { Label, MaskLines, Reveal } from './primitives';
import { wa } from './links';
import { useDesktop } from '../../hooks/useDesktop';
import '../../styles/categories.css';

// ============================================================================
//  Qué hacemos, por categoría. Acordado en la reunión del 31 de octubre de 2026
//  y afinado con la revisión de neuromarketing, ventas y marketing del 2 de
//  noviembre: una pregunta en segunda persona, una tarjeta por categoría con
//  «para quién», y un verbo por enlace. Cada tarjeta abre su propia página
//  (ejemplos reales, qué incluye y precio por escrito). Los proyectos reales y
//  los precios están más abajo en la portada.
// ============================================================================
const service = (id) => servicePages.find((item) => item.id === id);
const CATEGORIES = [
  { id: 'web-development', kicker: t('Webs y sistemas', 'Websites & systems'), who: t('Para operaciones que venden o gestionan en línea.', 'For operations that sell or manage online.'), title: t('Una web que vende y un sistema que ordena.', 'A website that sells and a system that organizes.'), link: t('Ver webs y sistemas', 'See websites & systems') },
  { id: 'process-automation', kicker: t('Automatización', 'Automation'), who: t('Para equipos que repiten tareas en Excel y correo.', 'For teams repeating tasks in Excel and email.'), title: t('Lo que alguien repite cada semana, hecho solo.', 'What someone repeats every week, done on its own.'), link: t('Ver automatización', 'See automation') },
  { id: 'business-intelligence', kicker: t('Finanzas y dashboards', 'Finance & dashboards'), who: t('Para gerencias que deciden con varias fuentes de datos.', 'For managers deciding with several data sources.'), title: t('Tus números al día, sin armar el reporte a mano.', 'Your numbers up to date, without building the report by hand.'), link: t('Ver finanzas y dashboards', 'See finance & dashboards') },
  { id: 'ai-integration', kicker: t('IA y machine learning', 'AI & machine learning'), who: t('Para una tarea concreta, con revisión humana.', 'For one specific task, with human review.'), title: t('Inteligencia para una tarea concreta.', 'Intelligence for a specific task.'), link: t('Ver IA y machine learning', 'See AI & machine learning') },
  { id: 'digital-marketing', kicker: 'Marketing', who: t('Para comercios y emprendimientos: tiene su propia página.', 'For shops and new businesses: it has its own page.'), title: t('Que más gente conozca tu negocio.', 'Help more people discover your business.'), link: t('Ver marketing', 'See marketing') },
].map((item) => ({ ...item, href: servicePath(service(item.id), locale), image: service(item.id).image }));

const Card = ({ item, index }) => {
  const portrait = item.image.includes('/marketing/');
  return (
    <Reveal as="li" delay={index * 0.05} className="category-card">
      <a href={item.href} data-track-label={`${t('Categorías', 'Categories')} · ${item.kicker}`}>
        <span className="category-card__image"><img src={item.image} srcSet={shotSrcSet(item.image)} sizes="(max-width: 767px) 92vw, (max-width: 1199px) 30vw, 260px" alt="" width={portrait ? 720 : 1600} height={portrait ? 900 : 1000} loading="lazy" decoding="async" /></span>
        <span className="category-card__kicker">{String(index + 1).padStart(2, '0')} / {item.kicker}</span>
        <h3>{item.title}</h3>
        <p className="category-card__who">{item.who}</p>
        <span className="category-card__link">{item.link} <ArrowUpRight size={16} aria-hidden="true" /></span>
      </a>
    </Reveal>
  );
};

const Categories = () => {
  // En computadora el enlace de WhatsApp abre el formulario corto (ui/LeadDialog.jsx): el texto no promete WhatsApp.
  const desktop = useDesktop();
  return (
  <section id="servicios" className="categories-section scroll-mt-24" aria-labelledby="categories-title">
    <div className="categories-container">
      <div className="categories-heading">
        <div>
          <Label>{t('Qué hacemos / Elegí tu caso', 'What we do / Pick your case')}</Label>
          <h2 id="categories-title"><MaskLines lines={[t('¿Qué querés resolver?', 'What do you want to solve?'), <em key="page">{t('Entrá por tu categoría.', 'Start with your category.')}</em>]} /></h2>
        </div>
        <Reveal delay={0.15} className="categories-intro">
          <p>{t('Cada página muestra ejemplos reales, qué incluye y qué no, y el alcance con precio por escrito antes de empezar. Las de sistemas, automatización, finanzas e IA traen además el precio publicado y una calculadora con tus números.', 'Each page shows real examples, what is and is not included, and a written scope and price before we start. Systems, automation, finance and AI also show the published price and a calculator with your numbers.')}</p>
        </Reveal>
      </div>
      <ul className="categories-grid" aria-label={t('Categorías de servicio', 'Service categories')}>
        {CATEGORIES.map((item, index) => <Card key={item.id} item={item} index={index} />)}
      </ul>
      <Reveal delay={0.1} className="categories-foot">
        <a href="#trabajo" className="categories-foot__next">{t('Ver proyectos reales', 'See real projects')} <ArrowDown size={15} aria-hidden="true" /></a>
        <a href="#paquetes" className="categories-foot__next">{t('Ver paquetes con precio publicado', 'See packages with published pricing')} <ArrowDown size={15} aria-hidden="true" /></a>
        <a href={wa(t('Hola JC Analytics, no sé bien qué categoría me toca. Les cuento mi caso:', 'Hi JC Analytics, I am not sure which category fits my case. Here it is:'))} target="_blank" rel="noreferrer" className="categories-foot__wa" data-need="Otro"><MessageCircle size={16} aria-hidden="true" />{desktop ? t('No sé cuál me toca · contanos tu caso', 'Not sure which one · tell us your case') : t('No sé cuál me toca · WhatsApp', 'Not sure which one · WhatsApp')}</a>
      </Reveal>
    </div>
  </section>
  );
};

export default Categories;
