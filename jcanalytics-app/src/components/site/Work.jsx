// Proyectos reales: capturas, código y anatomía de los repositorios que JC Analytics construye.
import { useId, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, Check, Code2, GitCommitHorizontal, Layers3, MessageCircle, MonitorSmartphone } from 'lucide-react';
import { t, locale } from '../../i18n/locale';
import { EVIDENCE_DATE, EVIDENCE_TOTALS, FACT_LABELS, PROJECTS, PROJECT_KINDS, projectCode, projectEvidence, screenImage } from '../../data/projects';
import { Label, MaskLines, Reveal } from './primitives';
import { wa } from './links';
import '../../styles/projects.css';

const _MOTION = motion;
const number = (value) => new Intl.NumberFormat(locale === 'es' ? 'es-CR' : 'en-US').format(value);
const compact = (value) => value >= 10000 ? `${Math.round(value / 1000)}k` : number(value);
const monthYear = (iso) => new Intl.DateTimeFormat(locale === 'es' ? 'es-CR' : 'en-US', { month: 'short', year: 'numeric' }).format(new Date(`${iso}T12:00:00`));
const VIEWS = [
  { id: 'screen', label: t('Pantalla', 'Screen'), icon: MonitorSmartphone },
  { id: 'code', label: t('Código', 'Code'), icon: Code2 },
  { id: 'anatomy', label: t('Anatomía', 'Anatomy'), icon: Layers3 },
];
const STACK_GROUPS = [
  ['front', t('Interfaz', 'Front end')], ['back', t('Servidor', 'Back end')], ['data', t('Datos', 'Data')],
  ['integrations', t('Integraciones', 'Integrations')], ['infra', t('Infraestructura y calidad', 'Infrastructure and quality')],
];
const TOTALS = [
  { value: String(EVIDENCE_TOTALS.projects), label: t('proyectos reales, con repositorio', 'real projects, each with a repository') },
  { value: compact(EVIDENCE_TOTALS.lines), label: t('líneas de código escritas', 'lines of code written') },
  { value: number(EVIDENCE_TOTALS.commits), label: t('commits en los últimos meses', 'commits over the last months') },
  { value: number(EVIDENCE_TOTALS.tests), label: t('pruebas automatizadas', 'automated tests') },
  { value: number(EVIDENCE_TOTALS.endpoints), label: t('endpoints de API', 'API endpoints') },
];

const whatsappFor = (project) => wa(t(
  `Hola JC Analytics, vi el proyecto ${project.name} (${project.sector}) y quiero algo así para mi negocio.`,
  `Hi JC Analytics, I saw the ${project.name} project (${project.sector}) and I want something like it for my business.`,
));
const WhatsApp = ({ href, children, className = '' }) => (
  <a href={href} target="_blank" rel="noreferrer" className={`works-wa ${className}`}><MessageCircle size={18} aria-hidden="true" />{children}</a>
);
const MARKETING = [
  { src: 'laburrada/foto-chifrijo', alt: t('Burrito chifrijo de La Burrada con guacamole y pico de gallo', 'La Burrada chifrijo burrito with guacamole and pico de gallo'), caption: t('Fotografía de producto · La Burrada', 'Product photography · La Burrada'), tall: true },
  { src: 'laburrada/foto-fries', alt: t('Loaded fries de La Burrada con guacamole y tocino', 'La Burrada loaded fries with guacamole and bacon'), caption: t('Fotografía de producto · La Burrada', 'Product photography · La Burrada'), tall: true },
  { src: 'laburrada/foto-pico', alt: t('Pico de gallo y guacamole de La Burrada', 'La Burrada pico de gallo and guacamole'), caption: t('Fotografía de producto · La Burrada', 'Product photography · La Burrada'), tall: true },
  { src: 'laburrada/instagram', alt: t('Publicaciones de Instagram de La Burrada diseñadas por JC Analytics', 'La Burrada Instagram posts designed by JC Analytics'), caption: t('Contenido para redes · La Burrada', 'Social media content · La Burrada') },
  { src: 'caviq/instagram', alt: t('Perfil de Instagram de CAVIQ con 3.617 seguidores', 'CAVIQ Instagram profile with 3,617 followers'), caption: t('Perfil y publicaciones · CAVIQ (3.617 seguidores)', 'Profile and posts · CAVIQ (3,617 followers)') },
];

const Browser = ({ project, screen }) => (
  <figure className="works-browser" style={{ '--project-color': project.accent }}>
    <div className="works-browser__bar" aria-hidden="true"><span /><span /><span /><em>{project.url ? project.url.replace(/^https?:\/\//, '').replace(/\/$/, '') : t('entorno local · datos de demostración', 'local environment · demo data')}</em></div>
    <div className="works-browser__viewport">
      <AnimatePresence mode="wait" initial={false}>
        <motion.img key={`${project.id}-${screen.id}`} src={screenImage(project, screen.id, 'desktop')} width={1600} height={1000} loading="lazy" decoding="async"
          alt={t(`Pantalla real de ${project.name}: ${screen.caption}`, `Real screen of ${project.name}: ${screen.caption}`)}
          initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
      </AnimatePresence>
    </div>
    <figcaption>{screen.caption}</figcaption>
  </figure>
);

const Phone = ({ project, screen }) => screen.mobile ? (
  <figure className="works-phone">
    <div className="works-phone__frame">
      <AnimatePresence mode="wait" initial={false}>
        <motion.img key={`${project.id}-${screen.mobile}`} src={screenImage(project, screen.mobile, 'mobile')} width={640} height={1386} loading="lazy" decoding="async"
          alt={t(`Versión móvil de ${project.name}`, `Mobile version of ${project.name}`)}
          initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
      </AnimatePresence>
    </div>
    <figcaption>{screen.mobileCaption || t('La misma pantalla en el celular.', 'The same screen on a phone.')}</figcaption>
  </figure>
) : null;

const CodeView = ({ project }) => {
  const sample = projectCode(project.id);
  const lines = sample.code.split('\n');
  return (
    <div className="works-code">
      <div className="works-code__bar"><span className="works-code__file">{sample.file}</span><span>{sample.language}</span></div>
      <pre className="works-code__pre" tabIndex={0}><code>{lines.map((line, index) => <span key={index} className="works-code__line"><span aria-hidden="true">{String(index + 1).padStart(2, ' ')}</span>{line}{'\n'}</span>)}</code></pre>
      <p className="works-code__why"><strong>{t('Por qué importa', 'Why it matters')}</strong>{sample.why}</p>
    </div>
  );
};

const Anatomy = ({ project }) => {
  const data = projectEvidence(project.id);
  const facts = Object.entries(data.facts).filter(([key, value]) => FACT_LABELS[key] && value > 0);
  return (
    <div className="works-anatomy">
      <div className="works-anatomy__numbers">
        <div><strong>{compact(data.lines)}</strong><span>{t('líneas de código', 'lines of code')}</span></div>
        <div><strong>{number(data.codeFiles)}</strong><span>{t('archivos de código', 'code files')}</span></div>
        <div><strong>{number(data.commits)}</strong><span>{t('commits', 'commits')}</span></div>
        {facts.slice(0, 5).map(([key, value]) => <div key={key}><strong>{number(value)}</strong><span>{FACT_LABELS[key]}</span></div>)}
      </div>
      <div className="works-anatomy__languages" role="img" aria-label={t('Lenguajes del repositorio', 'Repository languages')}>
        <div className="works-anatomy__bar">{data.languages.map((language) => <i key={language.name} style={{ flexGrow: language.share }} data-language={language.name} title={`${language.name} ${language.share}%`} />)}</div>
        <ul>{data.languages.map((language) => <li key={language.name}><i data-language={language.name} />{language.name} <span>{language.share}%</span></li>)}</ul>
      </div>
      <dl className="works-anatomy__stack">
        {STACK_GROUPS.map(([key, label]) => project.stack[key]?.length ? <div key={key}><dt>{label}</dt><dd>{project.stack[key].map((item) => <span key={item}>{item}</span>)}</dd></div> : null)}
      </dl>
      <p className="works-anatomy__timeline"><GitCommitHorizontal size={15} aria-hidden="true" />{t('Repositorio', 'Repository')} <code>{data.repo}</code> · {t('del', 'from')} {monthYear(data.firstCommit)} {t('al', 'to')} {monthYear(data.lastCommit)} · {t('cifras calculadas el', 'figures computed on')} {EVIDENCE_DATE}</p>
    </div>
  );
};

const Work = () => {
  const [active, setActive] = useState(0);
  const [view, setView] = useState('screen');
  const [screenIndex, setScreenIndex] = useState(0);
  const reduce = useReducedMotion();
  const descriptionId = useId();
  const project = PROJECTS[active];
  const screen = project.screens[screenIndex] || project.screens[0];
  const code = projectCode(project.id);
  const choose = (index, shot = 0) => { setActive(index); setScreenIndex(shot); };

  return (
    <section id="trabajo" className="case-section works-section" aria-labelledby="work-title">
      <div className="case-container">
        <div className="case-heading">
          <div>
            <Label>{t('Proyectos reales / Lo que construimos', 'Real projects / What we build')}</Label>
            <h2 id="work-title"><MaskLines lines={[t('Hecho,', 'Built,'), <em key="real">{t('no imaginado.', 'not imagined.')}</em>]} /></h2>
          </div>
          <Reveal className="case-heading__aside">
            <span className="case-count">{String(PROJECTS.length).padStart(2, '0')}<span>{t('PROYECTOS CON', 'PROJECTS WITH')}<br />{t('CÓDIGO REAL', 'REAL CODE')}</span></span>
            <p>{t('Capturas reales, código real y cifras calculadas desde cada repositorio. Nada ilustrado.', 'Real screenshots, real code and figures computed from each repository. Nothing illustrated.')}</p>
          </Reveal>
        </div>

        <Reveal className="works-totals" as="ul" aria-label={t('Totales de los repositorios', 'Repository totals')}>
          {TOTALS.map((item) => <li key={item.label}><strong>{item.value}</strong><span>{item.label}</span></li>)}
        </Reveal>

        <Reveal className="case-feature works-explorer">
          <div className="case-feature__top">
            <span>{t('REPOSITORIOS DE JC ANALYTICS / CAPTURAS, CÓDIGO Y ANATOMÍA', 'JC ANALYTICS REPOSITORIES / SCREENS, CODE AND ANATOMY')}</span>
            <span>{String(active + 1).padStart(2, '0')} — {String(PROJECTS.length).padStart(2, '0')}</span>
          </div>
          <div className="works-explorer__layout">
            <nav className="works-list" aria-label={t('Elegir proyecto', 'Choose a project')}>
              {PROJECTS.map((item, index) => (
                <button key={item.id} type="button" aria-pressed={active === index} aria-controls={descriptionId} onClick={() => choose(index)} style={{ '--project-color': item.accent }}>
                  <span className="works-list__number">{String(index + 1).padStart(2, '0')}</span>
                  <span className="works-list__name">{item.name}</span>
                  <span className="works-list__sector">{item.sector}</span>
                </button>
              ))}
            </nav>

            <div className="works-stage">
              <div className="works-stage__tabs" role="tablist" aria-label={t('Qué ver del proyecto', 'What to see of the project')}>
                {VIEWS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={view === item.id} className={view === item.id ? 'is-active' : ''} onClick={() => setView(item.id)}><item.icon size={15} aria-hidden="true" />{item.label}</button>)}
              </div>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={`${project.id}-${view}`} className={`works-stage__panel works-stage__panel--${view}`} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.25 }}>
                  {view === 'screen' && (
                    <div className="works-screen">
                      <div className="works-screen__devices"><Browser project={project} screen={screen} /><Phone project={project} screen={screen} /></div>
                      {project.screens.length > 1 && (
                        <div className="works-screen__strip" role="group" aria-label={t('Más pantallas de este proyecto', 'More screens of this project')}>
                          {project.screens.map((item, index) => (
                            <button key={item.id} type="button" aria-pressed={screenIndex === index} onClick={() => setScreenIndex(index)}>
                              <img src={screenImage(project, item.id, 'desktop')} width={160} height={100} loading="lazy" decoding="async" alt="" />
                              <span>{String(index + 1).padStart(2, '0')}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {view === 'code' && <CodeView project={project} />}
                  {view === 'anatomy' && <Anatomy project={project} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="works-summary" id={descriptionId} aria-live="polite">
            <div className="works-summary__copy">
              <span className="case-feature__sector">{PROJECT_KINDS[project.kind]} · {project.sector} · {project.status}</span>
              <h3>{project.name}</h3>
              <p className="works-summary__tagline">{project.tagline}</p>
              <ul>{project.features.slice(0, 3).map((feature) => <li key={feature}><Check size={13} aria-hidden="true" />{feature}</li>)}</ul>
            </div>
            <div className="works-summary__aside">
              <p className="works-summary__hook">{t('¿Querés algo así para tu negocio? Escribinos y te respondemos por WhatsApp.', 'Want something like this for your business? Message us and we reply on WhatsApp.')}</p>
              <WhatsApp href={whatsappFor(project)}>{t('Quiero algo así · WhatsApp', 'I want this · WhatsApp')}</WhatsApp>
              {project.url && <a href={project.url} target="_blank" rel="noreferrer" className="case-feature__link works-link">{t('Abrir el sitio', 'Open the site')}<span><ArrowUpRight size={20} aria-hidden="true" /></span></a>}
              <p className="works-summary__note">{t('Código:', 'Code:')} <code>{code.file}</code></p>
            </div>
          </div>
        </Reveal>

        <Reveal className="works-gallery-head">
          <div><Label>{t('Más pantallas reales', 'More real screens')}</Label><p>{t('Cada imagen es una pantalla de un sistema que existe.', 'Every image is a screen from a system that exists.')}</p></div>
          <span>{t('ESCRITORIO 1440 PX · MÓVIL 390 PX', 'DESKTOP 1440 PX · MOBILE 390 PX')}</span>
        </Reveal>
        <ul className="works-gallery" aria-label={t('Galería de pantallas reales', 'Gallery of real screens')}>
          {PROJECTS.flatMap((item) => item.screens.slice(1, 2).map((shot) => ({ project: item, shot }))).map(({ project: item, shot }, index) => (
            <Reveal key={`${item.id}-${shot.id}`} as="li" delay={(index % 3) * 0.06} className="works-gallery__item">
              <button type="button" style={{ '--project-color': item.accent }} onClick={() => { choose(PROJECTS.indexOf(item), item.screens.indexOf(shot)); setView('screen'); document.getElementById('trabajo')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); }} aria-label={t(`Ver ${item.name}: ${shot.caption}`, `View ${item.name}: ${shot.caption}`)}>
                <img src={screenImage(item, shot.id, 'desktop')} width={1600} height={1000} loading="lazy" decoding="async" alt={t(`Pantalla real de ${item.name}: ${shot.caption}`, `Real screen of ${item.name}: ${shot.caption}`)} />
                <span className="works-gallery__caption"><strong>{item.name}</strong><em>{shot.caption}</em></span>
              </button>
            </Reveal>
          ))}
        </ul>

        <Reveal className="works-gallery-head works-marketing-head">
          <div><Label>{t('También el contenido', 'The content, too')}</Label><p>{t('Fotos de producto y redes sociales de los mismos proyectos.', 'Product photos and social media for the same projects.')}</p></div>
          <span>{t('FOTOGRAFÍA · INSTAGRAM · CAMPAÑAS', 'PHOTOGRAPHY · INSTAGRAM · CAMPAIGNS')}</span>
        </Reveal>
        <ul className="works-marketing" aria-label={t('Fotografía y redes sociales reales', 'Real photography and social media')}>
          {MARKETING.map((item, index) => (
            <Reveal key={item.src} as="li" delay={(index % 3) * 0.06} className={item.tall ? 'works-marketing__item works-marketing__item--tall' : 'works-marketing__item'}>
              <img src={`${import.meta.env.BASE_URL}projects/${item.src}.webp`} width={item.tall ? 900 : 1000} height={item.tall ? 1125 : 760} loading="lazy" decoding="async" alt={item.alt} />
              <span>{item.caption}</span>
            </Reveal>
          ))}
        </ul>

        <Reveal className="works-close">
          <p>{t('Contanos qué necesitás. Un mensaje y seguimos por WhatsApp.', 'Tell us what you need. One message and we continue on WhatsApp.')}</p>
          <WhatsApp href={wa(t('Hola JC Analytics, vi sus proyectos y quiero conversar sobre uno para mi negocio.', 'Hi JC Analytics, I saw your projects and want to talk about one for my business.'))} className="works-wa--lg">{t('Escribinos por WhatsApp', 'Message us on WhatsApp')}</WhatsApp>
          <small>{t(`Cifras calculadas desde los repositorios el ${EVIDENCE_DATE}. Capturas con datos de demostración.`, `Figures computed from the repositories on ${EVIDENCE_DATE}. Screenshots use demo data.`)}</small>
        </Reveal>
      </div>
    </section>
  );
};
export default Work;
