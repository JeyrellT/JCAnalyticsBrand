import { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowRight, Search, Plus, Check, ArrowLeft } from 'lucide-react';
import { articles, servicePages, topics } from './content/catalog';
import { articlePath, servicePath, homePath, journalPath } from './seo/routes';
import { locale, t } from './i18n/locale';
import { wa, EMAIL } from './components/site/links';
import LanguageSwitcher from './components/ui/LanguageSwitcher';
import { trackContactClicks } from './seo/analytics';
import { useInitialFragment } from './components/useInitialFragment';
import './styles/discovery.css';
import './styles/journal.css';

const text = (item) => item[locale];
const path = (item) => item.minutes ? articlePath(item, locale) : servicePath(item, locale);

function ArticleCard({ article }) {
  const copy = text(article);
  return <a className="journal-card" data-article={article.id} href={articlePath(article, locale)}>
    <div className="journal-card__image"><img src={article.image} alt="" width="1536" height="1024" loading="lazy" decoding="async" /><span><ArrowUpRight size={22} /></span></div>
    <div className="journal-card__meta">{topics[article.topic][locale]}<span>{article.minutes} min</span></div>
    <h3>{copy.title}</h3><p>{copy.summary}</p>
  </a>;
}

function DecisionGuide() {
  const [choice, setChoice] = useState(0);
  const options = [
    { label: t('Mis datos no me ayudan a decidir', 'My data is not helping me decide'), article: 'data-quality', service: 'business-intelligence' },
    { label: t('Mi equipo repite demasiadas tareas', 'My team repeats too many tasks'), article: 'first-automation', service: 'process-automation' },
    { label: t('Mi web no explica bien mi negocio', 'My website does not explain my business'), article: 'useful-websites', service: 'web-development' },
  ];
  const article = articles.find(item => item.id === options[choice].article);
  const service = servicePages.find(item => item.id === options[choice].service);
  return <section className="decision-guide" id="decision-guide" aria-labelledby="guide-title">
    <div><span className="journal-eyebrow">{t('UNA PREGUNTA PARA EMPEZAR', 'ONE QUESTION TO START')}</span><h2 id="guide-title">{t('¿Dónde sentís', 'Where does your')}<br /><em>{t('la fricción?', 'business get stuck?')}</em></h2><p>{t('Elegí lo que más se parece a tu día a día. Hay una buena lectura para comenzar.', 'Choose what sounds like your everyday work. There is a good place to start reading.')}</p>
      <div className="guide-options">{options.map((option, index) => <button key={option.article} type="button" data-choice={index} aria-pressed={choice === index} onClick={() => setChoice(index)}><span>0{index + 1}</span>{option.label}{choice === index ? <Check size={18} /> : <ArrowRight size={18} />}</button>)}</div>
    </div>
    <div className="guide-result" id="guide-result" aria-live="polite" aria-atomic="true"><span className="journal-eyebrow">{t('TU PUNTO DE PARTIDA', 'YOUR STARTING POINT')}</span><h3>{text(article).title}</h3><p>{text(article).takeaway}</p><a className="journal-button" href={path(article)}>{t('Leer la guía', 'Read the guide')}<ArrowUpRight size={18} /></a><a className="journal-text-link" href={path(service)}>{t('Explorar el servicio relacionado', 'Explore the related service')}<ArrowRight size={16} /></a></div>
  </section>;
}

function ServicesDirectory() {
  return <section className="journal-services" aria-labelledby="services-title"><div className="journal-section-heading"><div><span className="journal-eyebrow">{t('DE LA LECTURA A LA ACCIÓN', 'FROM READING TO DOING')}</span><h2 id="services-title">{t('Hagamos que funcione.', 'Let’s make it work.')}</h2></div><p>{t('Cuatro formas de construir el siguiente paso de tu negocio.', 'Four ways to build the next step for your business.')}</p></div><div className="journal-service-grid">{servicePages.map((service, index) => <a href={path(service)} key={service.id}><span className="journal-eyebrow">0{index + 1} / {topics[service.topic][locale]}</span><h3>{text(service).title}</h3><ArrowUpRight size={22} /></a>)}</div></section>;
}

function JournalHome() {
  const [topic, setTopic] = useState('all');
  const [query, setQuery] = useState('');
  const normalized = query.trim().toLocaleLowerCase(locale).normalize('NFD').replace(/\p{Diacritic}/gu, '');
  const filtered = articles.filter(article => (topic === 'all' || article.topic === topic) && `${text(article).title} ${text(article).summary}`.toLocaleLowerCase(locale).normalize('NFD').replace(/\p{Diacritic}/gu, '').includes(normalized));
  const featured = articles.find(article => article.id === 'human-review');
  return <>
    <section className="journal-hero"><div className="journal-container"><span className="journal-eyebrow"><span className="journal-dot" />JC ANALYTICS / {t('IDEAS ABIERTAS', 'OPEN IDEAS')}</span><div className="journal-hero__heading"><h1>{t('La tecnología empieza', 'Good technology starts')}<br /><em>{t('con una buena pregunta.', 'with a better question.')}</em></h1><p>{t('Notas para pensar mejor sobre datos, software e inteligencia artificial. Ideas prácticas para quienes toman decisiones.', 'Notes on data, software and artificial intelligence. Practical thinking for people making business decisions.')}</p></div>
      <a href={path(featured)} className="journal-feature"><div className="journal-feature__image"><img src={featured.image} alt="" width="1536" height="1024" fetchPriority="high" /></div><div className="journal-feature__copy"><span className="journal-eyebrow">01 / {t('EN FOCO', 'IN FOCUS')}</span><h2>{text(featured).title}</h2><p>{text(featured).summary}</p><span className="journal-text-link">{t('Explorar la idea', 'Explore the idea')}<ArrowUpRight size={22} /></span></div></a>
    </div></section>
    <div className="journal-container"><section className="journal-library" aria-labelledby="library-title"><div className="journal-section-heading"><div><span className="journal-eyebrow">{t('CONOCIMIENTO PARA COMPARTIR', 'KNOWLEDGE WORTH SHARING')}</span><h2 id="library-title">{t('El cuaderno.', 'The field notes.')}</h2></div><label className="journal-search" htmlFor="insight-search"><Search size={18} /><span className="sr-only">{t('Buscar ideas', 'Search insights')}</span><input id="insight-search" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={t('Buscá una idea…', 'Find an idea…')} /></label></div>
      <div className="journal-filters" role="group" aria-label={t('Filtrar por tema', 'Filter by topic')}>{[['all', t('Todas las ideas', 'All insights')], ...Object.entries(topics).map(([id, copy]) => [id, copy[locale]])].map(([id, label]) => <button type="button" data-topic={id} key={id} onClick={() => setTopic(id)} aria-pressed={topic === id}>{label}</button>)}</div>
      <p className="journal-count" aria-live="polite">{filtered.length} {t('lecturas para explorar', 'notes to explore')}</p><div className="journal-cards" id="journal-grid">{filtered.map(article => <ArticleCard key={article.id} article={article} />)}</div>
      {!filtered.length && <div className="journal-empty"><p>{t('No encontramos esa idea. Probá otro tema o palabra.', 'No matching notes yet. Try another topic or word.')}</p><button type="button" className="journal-text-link" onClick={() => { setQuery(''); setTopic('all'); }}>{t('Mostrar todas las ideas', 'Show all insights')}<ArrowRight size={18} /></button></div>}
    </section><DecisionGuide /><ServicesDirectory /></div>
  </>;
}

function DocumentPage({ route }) {
  const item = route.data;
  const copy = text(item);
  const isArticle = route.type === 'article';
  const related = articles.filter(article => article.id !== item.id).sort((a, b) => Number(b.topic === item.topic) - Number(a.topic === item.topic)).slice(0, 3);
  return <div className="journal-container"><nav className="journal-breadcrumb" aria-label={t('Ruta de navegación', 'Breadcrumb')}><a href={homePath(locale)}>{t('Inicio', 'Home')}</a><span>/</span><a href={journalPath(locale)}>{t('Ideas', 'Insights')}</a><span>/</span><span>{topics[item.topic][locale]}</span></nav>
    <article className="journal-document"><header className="document-heading"><span className="journal-eyebrow">{isArticle ? t('CUADERNO DE IDEAS', 'FIELD NOTES') : t('SERVICIOS / COSTA RICA', 'SERVICES / COSTA RICA')} · {topics[item.topic][locale]}</span><h1>{copy.title}</h1><p className="document-summary">{copy.summary}</p>{isArticle && <div className="document-byline"><span>JC Analytics</span><span>{item.minutes} min {t('de lectura', 'read')}</span><time dateTime={item.published}>{new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${item.published}T12:00:00Z`))}</time></div>}</header>
      <figure className="document-cover"><img src={item.image} alt="" width="1536" height="1024" fetchPriority="high" /><figcaption>{t('Ilustración conceptual creada con IA. No representa proyectos ni datos de clientes.', 'Concept illustration created with AI. It does not depict client projects or data.')}</figcaption></figure>
      <div className="document-layout"><aside className="document-toc"><span className="journal-eyebrow">{t('EN ESTA LECTURA', 'ON THIS PAGE')}</span><nav aria-label={t('Índice del contenido', 'Table of contents')}>{copy.sections.map((section, index) => <a href={`#${section.id}`} key={section.id}><span>0{index + 1}</span>{section.heading}</a>)}<a href="#discussion"><span>↗</span>{t('Para conversar', 'Let’s discuss')}</a></nav></aside>
        <div className="document-body"><div className="document-takeaway"><span className="journal-eyebrow">{t('LA IDEA CLAVE', 'THE KEY IDEA')}</span><p>{copy.takeaway}</p></div>
          {copy.sections.map(section => <section key={section.id} id={section.id}><h2>{section.heading}</h2>{section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}{section.bullets && <ul>{section.bullets.map(bullet => <li key={bullet}>{bullet}</li>)}</ul>}</section>)}
          <section className="document-discussion" id="discussion"><span className="journal-eyebrow">{t('LAS BUENAS IDEAS SE CONVERSAN', 'GOOD IDEAS START CONVERSATIONS')}</span><h2>{t('Llevá la pregunta a tu equipo.', 'Bring the question to your team.')}</h2><p>{t('Tres preguntas para explorar juntos. Abrí una y usala como punto de partida.', 'Three questions to explore together. Open one and use it to start a conversation.')}</p>{copy.discussion.map((question, index) => <details key={question}><summary><span>0{index + 1}</span>{question}<Plus size={18} /></summary><p>{t('Anotá una situación concreta, escuchá otra perspectiva y acordá un pequeño próximo paso. Si querés una mirada externa, podemos conversarlo.', 'Write down a specific situation, listen to another perspective and agree on a small next step. If you would like an outside perspective, we can talk it through.')}</p><a href={wa(t(`Hola, me gustaría conversar sobre «${copy.title}». Mi pregunta: ${question}`, `Hi, I would like to discuss “${copy.title}”. My question: ${question}`))} target="_blank" rel="noreferrer">{t('Conversar con el estudio', 'Discuss with the studio')}<ArrowUpRight size={16} /></a></details>)}</section>
          {copy.sources.length > 0 && <section className="document-sources"><h2>{t('Para seguir explorando', 'Further reading')}</h2><p>{t('Referencias públicas que amplían estas ideas.', 'Public references that explore these ideas further.')}</p><ul>{copy.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}<ArrowUpRight size={14} /></a></li>)}</ul></section>}
          <div className="document-cta"><h2>{t('¿Cómo se ve esto en tu negocio?', 'What could this look like in your business?')}</h2><p>{t('Empecemos con una conversación de 30 minutos, sin costo, sobre tu objetivo y tus prioridades.', 'Start with a free 30-minute conversation about your goals and priorities.')}</p><a className="journal-button" href={`${homePath(locale)}#contacto`}>{t('Contanos tu idea', 'Tell us your idea')}<ArrowUpRight size={18} /></a></div>
        </div>
      </div>
    </article>
    <section className="journal-related"><div className="journal-section-heading"><h2>{t('Seguí el hilo.', 'Keep exploring.')}</h2><a className="journal-text-link" href={journalPath(locale)}>{t('Todas las ideas', 'All insights')}<ArrowRight size={18} /></a></div><div className="journal-cards">{related.map(article => <ArticleCard key={article.id} article={article} />)}</div></section>
    {!isArticle && <ServicesDirectory />}
  </div>;
}

export default function JournalApp({ route }) {
  useInitialFragment();
  useEffect(trackContactClicks, []);
  useEffect(() => { if (!route) { document.title = '404 | JC Analytics'; document.querySelector('meta[name="robots"]')?.setAttribute('content', 'noindex, follow'); } }, [route]);
  return <div className="journal-site"><a className="journal-skip" href="#main-content">{t('Saltar al contenido', 'Skip to content')}</a><header className="journal-nav"><a className="journal-brand" href={homePath(locale)}><img src="/LogoMark.webp" alt="" width="162" height="200" /><span>JC Analytics<small>{t('EL ESTUDIO / LAS IDEAS', 'THE STUDIO / THE IDEAS')}</small></span></a><nav aria-label={t('Navegación principal', 'Main navigation')}><a href={homePath(locale)}>{t('Estudio', 'Studio')}</a><a href={journalPath(locale)} aria-current={route?.type === 'journal' ? 'page' : undefined}>{t('Ideas', 'Insights')}</a><a className="journal-nav-contact" href={`${homePath(locale)}#contacto`}>{t('Hablemos', 'Let’s talk')}<ArrowUpRight size={16} /></a></nav><LanguageSwitcher /></header>
    <main id="main-content" tabIndex={-1}>{!route ? <section className="journal-not-found"><span className="journal-eyebrow">404</span><h1>{t('Esta página no existe.', 'This page could not be found.')}</h1><a className="journal-button" href={journalPath(locale)}><ArrowLeft size={18} />{t('Explorar ideas', 'Explore insights')}</a></section> : route.type === 'journal' ? <JournalHome /> : <DocumentPage route={route} />}</main>
    <footer className="journal-footer"><div><a className="journal-footer-brand" href={homePath(locale)}>JC Analytics<span>↗</span></a><p>{t('Software, datos e inteligencia. Ideas desde Costa Rica.', 'Software, data and intelligence. Ideas from Costa Rica.')}</p></div><div><a href={`mailto:${EMAIL}`}>{EMAIL}</a><a href={journalPath(locale)}>{t('Explorar el cuaderno', 'Explore the field notes')}</a><span>© {new Date().getFullYear()} JC Analytics</span></div></footer>
  </div>;
}
