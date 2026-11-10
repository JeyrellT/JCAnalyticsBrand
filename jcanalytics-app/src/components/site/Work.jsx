// ============================================================================
//  ¿Ya lo hicieron? · proyectos reales, contados para quien compra.
//
//  Auditoría de noviembre de 2026 (lo que cambió y por qué):
//    · El resumen de cada proyecto dice el problema del negocio y lo que se
//      construyó (los campos `problem` y `built` ya existían y no se mostraban);
//      las decisiones técnicas pasaron a la pestaña «Cómo está hecho».
//    · Las cifras de la sección hablan de proyectos, sitios que se pueden abrir y
//      giros de negocio. Líneas de código, commits y endpoints siguen en la
//      pestaña técnica de cada proyecto.
//    · Un solo selector: la lista lleva la miniatura de cada sistema. Antes había
//      una lista y, más abajo, una galería de diez capturas grandes que hacía lo
//      mismo y sumaba casi tres pantallas.
//    · El explorador arranca en un proyecto con sitio público (La Burrada) y el
//      enlace dice el dominio que abre.
//    · Las pestañas cumplen el patrón de teclado (flechas, Inicio, Fin) y tienen
//      panel asociado; las miniaturas se nombran por lo que muestran.
//  Capturas, código y cifras salen de los repositorios (data/projects.js).
// ============================================================================
import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Check, Code2, GitCommitHorizontal, Layers3, MonitorSmartphone } from 'lucide-react';
import { t, locale } from '../../i18n/locale';
import { EVIDENCE_DATE, EVIDENCE_TOTALS, FACT_LABELS, PROJECTS, PROJECT_KINDS, projectCode, projectEvidence, screenImage, shotSrcSet } from '../../data/projects';
import { adPackage, thousands } from '../../data/packages';
import { Label, MaskLines, Reveal } from './primitives';
import { wa } from './links';
import { MESSAGES } from './messages';
import { getCase } from './case';
import ContactIcon from './ContactIcon';
import { useDesktop } from '../../hooks/useDesktop';
import '../../styles/projects.css';

const _MOTION = motion;
const number = thousands; // mismo separador de miles que los precios (data/packages.js)
const compact = (value) => value >= 10000 ? `${Math.round(value / 1000)}k` : number(value);
const monthYear = (iso) => new Intl.DateTimeFormat(locale === 'es' ? 'es-CR' : 'en-US', { month: 'short', year: 'numeric' }).format(new Date(`${iso}T12:00:00`));
const domain = (url) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
const VIEWS = [
  { id: 'screen', label: t('Pantallas', 'Screens'), icon: MonitorSmartphone },
  { id: 'code', label: t('Código', 'Code'), icon: Code2 },
  { id: 'anatomy', label: t('Cómo está hecho', 'How it is built'), icon: Layers3 },
];
const STACK_GROUPS = [
  ['front', t('Interfaz', 'Front end')], ['back', t('Servidor', 'Back end')], ['data', t('Datos', 'Data')],
  ['integrations', t('Integraciones', 'Integrations')], ['infra', t('Infraestructura y calidad', 'Infrastructure and quality')],
];
// Cifras para quien compra: todas se cuentan desde los datos, no se escriben a mano.
const LIVE = PROJECTS.filter((item) => item.url).length;
const SECTORS = new Set(PROJECTS.map((item) => item.sector)).size;
const TOTALS = [
  { value: String(PROJECTS.length), label: t('proyectos reales, hechos por este equipo', 'real projects, built by this team') },
  { value: String(LIVE), label: t('con sitio público que podés abrir hoy', 'with a public site you can open today') },
  { value: String(SECTORS), label: t('giros distintos: restaurante, barbería, transporte, taller, facturación…', 'different industries: restaurant, barbershop, transport, body shop, invoicing…') },
  { value: number(EVIDENCE_TOTALS.tests), label: t('pruebas automatizadas escritas para esos sistemas', 'automated tests written for those systems') },
];

const WhatsApp = ({ href, children, className = '', ...rest }) => (
  <a href={href} target="_blank" rel="noreferrer" className={`works-wa ${className}`} {...rest}><ContactIcon size={18} />{children}</a>
);

const Browser = ({ project, screen }) => (
  <figure className="works-browser" style={{ '--project-color': project.accent }}>
    {/* Con sitio público, la dirección de la barra es un enlace: abrir el sistema real es la prueba más fuerte y
        antes quedaba al final de la sección (segunda ronda de la auditoría). */}
    <div className="works-browser__bar"><span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />{project.url
      ? <a href={project.url} target="_blank" rel="noreferrer" data-track-label={`Proyectos · Abrir ${project.name} · barra`}>{domain(project.url)}<ArrowUpRight size={13} aria-hidden="true" /><span className="sr-only"> {t('(abre el sitio en otra pestaña)', '(opens the site in a new tab)')}</span></a>
      : <em aria-hidden="true">{t('captura con datos de demostración', 'screenshot with demo data')}</em>}</div>
    <div className="works-browser__viewport">
      <AnimatePresence mode="wait" initial={false}>
        <motion.img key={`${project.id}-${screen.id}`} src={screenImage(project, screen.id, 'desktop')} srcSet={shotSrcSet(screenImage(project, screen.id, 'desktop'))} sizes="(max-width: 767px) 92vw, 900px" width={1600} height={1000} loading="lazy" decoding="async"
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
        <motion.img key={`${project.id}-${screen.mobile}`} src={screenImage(project, screen.mobile, 'mobile')} srcSet={shotSrcSet(screenImage(project, screen.mobile, 'mobile'))} sizes="220px" width={640} height={1386} loading="lazy" decoding="async"
          alt={t(`Versión móvil de ${project.name}`, `Mobile version of ${project.name}`)}
          initial={{ opacity: 0.2 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
      </AnimatePresence>
    </div>
    <figcaption>{screen.mobileCaption || t('El mismo sistema en el celular.', 'The same system on a phone.')}</figcaption>
  </figure>
) : null;

const CodeView = ({ project }) => {
  const sample = projectCode(project.id);
  const lines = sample.code.split('\n');
  return (
    <div className="works-code">
      <div className="works-code__bar"><span className="works-code__file">{sample.file}</span><span>{sample.language}</span></div>
      <pre className="works-code__pre" tabIndex={0} role="region" aria-label={t(`Código de ${sample.file}`, `Code from ${sample.file}`)}><code>{lines.map((line, index) => <span key={index} className="works-code__line"><span aria-hidden="true">{String(index + 1).padStart(2, ' ')}</span>{line}{'\n'}</span>)}</code></pre>
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
      <div className="works-anatomy__decisions">
        <h4>{t('Decisiones técnicas', 'Technical decisions')}</h4>
        <ul>{project.features.map((feature) => <li key={feature}><Check size={13} aria-hidden="true" />{feature}</li>)}</ul>
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

// Qué proyecto abre el explorador: el que pide la URL (?proyecto=<id>, desde las páginas de servicio), el
// relacionado con el paquete del anuncio, el del giro que la persona eligió en «Tu caso en una frase» o,
// si no, el primero de la lista, que tiene sitio público.
const fromQuery = (name) => (typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get(name));
const indexOfProject = (id) => PROJECTS.findIndex((item) => item.id === id);
const initialProject = () => Math.max(0, ...[fromQuery('proyecto'), adPackage?.related, getCase().project?.id].map(indexOfProject).filter((index) => index >= 0).slice(0, 1));
const screenOf = (project, id) => Math.max(0, project.screens.findIndex((item) => item.id === id));

const Work = () => {
  // En computadora el botón abre el formulario corto, no WhatsApp Web: el texto lo dice.
  const desktop = useDesktop();
  const [active, setActive] = useState(initialProject);
  const [view, setView] = useState('screen');
  const [screenIndex, setScreenIndex] = useState(() => screenOf(PROJECTS[initialProject()], fromQuery('pantalla') ?? (fromQuery('proyecto') || adPackage?.related ? null : getCase().chosenBusiness?.screen)));
  const reduce = useReducedMotion();
  const descriptionId = useId();
  const tabs = useRef(null);
  const project = PROJECTS[active];
  const screen = project.screens[screenIndex] || project.screens[0];
  const choose = (index, shot = 0) => { setActive(index); setScreenIndex(shot); };
  // La portada, «tu caso en una frase» o la hoja de un paquete pueden pedir «ver este proyecto» (y una
  // pantalla concreta) sin recargar la página.
  useEffect(() => {
    const show = (event) => {
      const index = indexOfProject(event.detail?.id);
      if (index < 0) return;
      setActive(index);
      setScreenIndex(screenOf(PROJECTS[index], event.detail?.screen));
      setView('screen');
    };
    window.addEventListener('jca:show-project', show);
    return () => window.removeEventListener('jca:show-project', show);
  }, []);
  // Pestañas: flechas, Inicio y Fin mueven la selección y el foco (patrón de pestañas de WAI-ARIA).
  const onTabKey = (event) => {
    const current = VIEWS.findIndex((item) => item.id === view);
    const next = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: VIEWS.length - 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    const target = VIEWS[(next + VIEWS.length) % VIEWS.length];
    setView(target.id);
    tabs.current?.querySelector(`#works-tab-${target.id}`)?.focus();
  };

  return (
    <section id="trabajo" className="case-section works-section" aria-labelledby="work-title">
      <div className="case-container">
        <div className="case-heading">
          <div>
            <Label>{t('¿Ya lo hicieron? / Proyectos reales', 'Have you done this before? / Real projects')}</Label>
            <h2 id="work-title"><MaskLines lines={[t('Hecho,', 'Built,'), <em key="real">{t('no imaginado.', 'not imagined.')}</em>]} /></h2>
          </div>
          <Reveal className="case-heading__aside works-heading__aside">
            <p>{t(
              `Sistemas que este equipo construyó para negocios de Costa Rica. ${LIVE} tienen sitio público: abrilos y probalos. Las capturas usan datos de demostración.`,
              `Systems this team built for businesses in Costa Rica. ${LIVE} have a public site: open them and try them. Screenshots use demo data.`,
            )}</p>
          </Reveal>
        </div>

        <Reveal className="works-totals" as="ul" aria-label={t('Los proyectos en cifras', 'The projects in numbers')}>
          {TOTALS.map((item) => <li key={item.label}><strong>{item.value}</strong><span>{item.label}</span></li>)}
        </Reveal>

        <Reveal className="case-feature works-explorer" id="proyecto">
          <div className="case-feature__top works-explorer__top">
            <span>{t('Elegí un proyecto y mirá sus pantallas', 'Pick a project and look at its screens')}</span>
            <span aria-hidden="true">{String(active + 1).padStart(2, '0')} — {String(PROJECTS.length).padStart(2, '0')}</span>
          </div>
          <div className="works-explorer__layout">
            <div className="works-list" role="group" aria-label={t('Elegir proyecto', 'Choose a project')}>
              {PROJECTS.map((item, index) => (
                <button key={item.id} type="button" aria-pressed={active === index} aria-controls={descriptionId} onClick={() => choose(index)} style={{ '--project-color': item.accent }} data-track-label={`Proyectos · Ver ${item.name}`}>
                  <img className="works-list__thumb" src={screenImage(item, item.screens[0].id, 'desktop')} srcSet={shotSrcSet(screenImage(item, item.screens[0].id, 'desktop'))} sizes="(max-width: 1023px) 140px, 72px" width={160} height={100} loading="lazy" decoding="async" alt="" />
                  <span className="works-list__name">{item.name}</span>
                  <span className="works-list__sector">{item.sector}</span>
                </button>
              ))}
            </div>

            <div className="works-stage">
              <div ref={tabs} className="works-stage__tabs" role="tablist" aria-label={t('Qué ver del proyecto', 'What to see of the project')} onKeyDown={onTabKey}>
                {VIEWS.map((item) => (
                  <button key={item.id} type="button" role="tab" id={`works-tab-${item.id}`} aria-selected={view === item.id} aria-controls="works-panel" tabIndex={view === item.id ? 0 : -1}
                    className={view === item.id ? 'is-active' : ''} onClick={() => setView(item.id)} data-track-label={`Proyectos · Pestaña ${item.label}`}><item.icon size={15} aria-hidden="true" />{item.label}</button>
                ))}
              </div>
              <div id="works-panel" role="tabpanel" aria-labelledby={`works-tab-${view}`}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={`${project.id}-${view}`} className={`works-stage__panel works-stage__panel--${view}`} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.25 }}>
                    {view === 'screen' && (
                      <div className="works-screen">
                        <div className="works-screen__devices"><Browser project={project} screen={screen} /><Phone project={project} screen={screen} /></div>
                        {project.screens.length > 1 && (
                          <div className="works-screen__strip" role="group" aria-label={t('Más pantallas de este proyecto', 'More screens of this project')}>
                            {project.screens.map((item, index) => (
                              <button key={item.id} type="button" aria-pressed={screenIndex === index} onClick={() => setScreenIndex(index)} aria-label={`${String(index + 1).padStart(2, '0')} · ${item.caption}`}>
                                <img src={screenImage(project, item.id, 'desktop')} srcSet={shotSrcSet(screenImage(project, item.id, 'desktop'))} sizes="160px" width={160} height={100} loading="lazy" decoding="async" alt="" />
                                <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
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
          </div>

          <div className="works-summary" id={descriptionId}>
            <p className="sr-only" role="status">{t(`Proyecto en pantalla: ${project.name}. ${project.tagline}`, `Project on screen: ${project.name}. ${project.tagline}`)}</p>
            <div className="works-summary__copy">
              <span className="case-feature__sector">{PROJECT_KINDS[project.kind]} · {project.sector} · {project.status}</span>
              <h3>{project.name}</h3>
              <p className="works-summary__tagline">{project.tagline}</p>
              <dl className="works-summary__story">
                <div><dt>{t('El problema', 'The problem')}</dt><dd>{project.problem}</dd></div>
                <div><dt>{t('Lo que construimos', 'What we built')}</dt><dd>{project.built}</dd></div>
              </dl>
            </div>
            <div className="works-summary__aside">
              <p className="works-summary__hook">{t('¿Querés algo así para tu negocio?', 'Want something like this for your business?')}</p>
              <WhatsApp href={wa(MESSAGES.project(project))} data-need={project.need} data-track-label={`Proyectos · Quiero algo así · ${project.name}`}>{desktop ? t('Quiero algo así', 'I want something like this') : t('Quiero algo así · WhatsApp', 'I want something like this · WhatsApp')}</WhatsApp>
              <p className="works-summary__after">{desktop
                ? t('Dejás tu contacto y te escribimos en menos de 24 h. La primera conversación, de 30 minutos, no tiene costo.', 'Leave your contact details and we’ll get back to you within 24 hours. The first 30-minute conversation is free.')
                : t('El mensaje ya va escrito con el nombre del proyecto. Te respondemos en menos de 24 h.', 'The message is already written with the project name. We reply within 24 hours.')}</p>
              {project.url && <a href={project.url} target="_blank" rel="noreferrer" className="works-link" data-track-label={`Proyectos · Abrir ${project.name}`}>{t('Abrir', 'Open')} {domain(project.url)}<ArrowUpRight size={17} aria-hidden="true" /><span className="sr-only"> {t('(se abre en otra pestaña)', '(opens in a new tab)')}</span></a>}
            </div>
          </div>
        </Reveal>

        <Reveal className="works-foot">
          <small>{t(`Capturas tomadas de cada sistema corriendo, con datos de demostración. Cifras calculadas desde los repositorios el ${EVIDENCE_DATE}.`, `Screenshots taken from each running system, with demo data. Figures computed from the repositories on ${EVIDENCE_DATE}.`)}</small>
          <a href="#paquetes" className="works-foot__next" data-track-label="Proyectos · Ver paquetes">{t('¿Cuánto cuesta algo así? Ver paquetes con precio', 'What does something like this cost? See priced packages')}<ArrowDown size={16} aria-hidden="true" /></a>
        </Reveal>
      </div>
    </section>
  );
};
export default Work;
