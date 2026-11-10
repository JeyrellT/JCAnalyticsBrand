// ============================================================================
//  src/components/site/CaseMatcher.jsx
//  «Tu caso en una frase» · la salida para quien no sabe qué categoría le toca.
//
//  La persona completa una oración con dos elecciones («Tengo un restaurante y
//  quiero recibir pedidos en línea») y la portada le contesta con lo que ya
//  existe: la categoría que le corresponde, el paquete publicado más cercano con
//  su precio y plazo, y un proyecto real de su mismo giro.
//
//  Segunda ronda de la auditoría (noviembre de 2026):
//    · La respuesta trae precio y plazo: antes nombraba el paquete y pedía otro
//      clic para ver un número.
//    · El botón más fuerte es cotizar con la frase (verde, como en el resto de
//      la portada); ver qué incluye el paquete abre su detalle sin salir de la
//      página, y la página de la categoría queda como enlace de texto.
//    · El proyecto real se muestra con su aclaración: es un sistema más amplio
//      que el paquete (un restaurante veía un sistema de pedidos con pagos junto
//      a un paquete de reservas que no los incluye).
//    · Con una sola elección hay una guía en vez de un espacio vacío.
//    · La elección queda guardada para el resto de la visita (case.js): los
//      pedidos y cotizaciones salen con la frase y la portada marca «El de tu caso».
//
//  Nada es inventado: los giros son los de los diez proyectos de data/projects.js
//  y cada meta lleva a una de las cinco categorías. Funciona con dos <select>
//  nativos (teclado, lector de pantalla y selector del teléfono sin código
//  propio); sin JavaScript queda el enlace «Contanos tu caso» de la sección.
//  A las plataformas de anuncios solo les llega el clic de contacto habitual.
// ============================================================================
import { useId } from 'react';
import { ArrowDown, ArrowRight } from 'lucide-react';
import { t } from '../../i18n/locale';
import { wa } from './links';
import { MESSAGES } from './messages';
import { BUSINESSES, GOALS, setCase, useCase } from './case';
import { screenImage, shotSrcSet } from '../../data/projects';
import ContactIcon from './ContactIcon';
import { useDesktop } from '../../hooks/useDesktop';

const showProject = (id, screen) => window.dispatchEvent(new CustomEvent('jca:show-project', { detail: { id, screen } }));

export default function CaseMatcher() {
  const desktop = useDesktop();
  const id = useId();
  const { business, goal, chosenBusiness, chosenGoal, category, project, pack, sentence } = useCase();
  const chooseBusiness = (event) => {
    setCase({ business: event.target.value });
    // El explorador de proyectos queda en el proyecto de ese giro, sin mover la página.
    const next = BUSINESSES.find((item) => item.id === event.target.value);
    if (next?.project) showProject(next.project, next.screen);
  };
  return (
    <div className="case-matcher">
      <p className="case-matcher__lead">{t('¿No sabés cuál te toca? Armá tu caso en una frase:', 'Not sure which one fits? Put your case in one sentence:')}</p>
      <p className="case-matcher__sentence">
        <label htmlFor={`${id}-negocio`}>{t('Tengo', 'I have')}</label>{' '}
        <select id={`${id}-negocio`} value={business} onChange={chooseBusiness} data-track-label="Caso · negocio">
          <option value="">{t('elegí tu negocio', 'pick your business')}</option>
          {BUSINESSES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>{' '}
        <label htmlFor={`${id}-meta`}>{t('y quiero', 'and I want to')}</label>{' '}
        <select id={`${id}-meta`} value={goal} onChange={(event) => setCase({ goal: event.target.value })} data-track-label="Caso · meta">
          <option value="">{t('elegí qué resolver', 'pick what to solve')}</option>
          {GOALS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select><span className="case-matcher__dot">.</span>
      </p>
      <div className="case-matcher__result" role="status" aria-live="polite">
        {chosenBusiness && !chosenGoal && <p className="case-matcher__hint">{t('Ahora elegí qué querés resolver y te decimos por dónde empezar.', 'Now pick what you want to solve and we’ll tell you where to start.')}</p>}
        {category && (
          <div className="case-matcher__answer">
            <div className="case-matcher__text">
              <p className="case-matcher__verdict">
                {t('Tu caso es de', 'Your case belongs to')} <strong>{category.label}</strong>.
                {pack && <> {t('El paquete publicado más cercano es', 'The closest published package is')} <a href={`#paquete-${pack.key}`} data-track-label={`Caso · Paquete ${pack.key}`}>{pack.name}</a>{t(`: ${pack.priceLabel} + IVA (≈ ${pack.colones}), entrega en ${pack.time}.`, `: ${pack.priceLabel} + tax (≈ ${pack.colones}), delivered in ${pack.time}.`)}</>}
              </p>
              {project && (
                <p className="case-matcher__proof">
                  {t('Un proyecto real de tu giro:', 'A real project in your line of business:')} <strong>{project.name}</strong> <span>({project.sector})</span>.
                  {pack && <> {t('Es un sistema más amplio que ese paquete: si querés algo así, te lo cotizamos por escrito.', 'It is a broader system than that package: if you want something like it, we quote it in writing.')}</>}
                </p>
              )}
              <div className="case-matcher__actions">
                <a className="case-matcher__wa" href={wa(MESSAGES.caseQuote(sentence, pack))} target="_blank" rel="noreferrer" data-need={chosenGoal.need} data-track-label="Caso · Cotizar con mi frase"><ContactIcon size={17} />{desktop ? t('Cotizar con mi frase', 'Get a quote with my sentence') : t('Cotizar por WhatsApp', 'Get a quote on WhatsApp')}</a>
                {pack
                  ? <a className="case-matcher__go" href={`#hoja-${pack.key}`} data-track-label={`Caso · Detalle ${pack.key}`}>{t(`Ver qué incluye ${pack.name}`, `See what ${pack.name} includes`)}</a>
                  : <a className="case-matcher__go" href={category.href} data-track-label={`Caso · Ver ${category.label}`}>{t(`Ver planes y precios de ${category.label}`, `See ${category.label} plans and prices`)} <ArrowRight size={16} aria-hidden="true" /></a>}
              </div>
              <p className="case-matcher__more">
                {pack && <a className="case-matcher__link" href={category.href} data-track-label={`Caso · Ver ${category.label}`}>{t(`Ver más ejemplos de ${category.label}`, `See more ${category.label} examples`)} <ArrowRight size={15} aria-hidden="true" /></a>}
                {project && <a className="case-matcher__link" href="#proyecto" onClick={() => showProject(project.id, chosenBusiness.screen)} data-track-label={`Caso · Proyecto ${project.id}`}>{t('Ver sus pantallas', 'See its screens')} <ArrowDown size={15} aria-hidden="true" /></a>}
              </p>
            </div>
            {project && (
              <a className="case-matcher__shot" href="#proyecto" onClick={() => showProject(project.id, chosenBusiness.screen)} style={{ '--project-color': project.accent }} tabIndex={-1} aria-hidden="true">
                <img src={screenImage(project, chosenBusiness.screen, 'desktop')} srcSet={shotSrcSet(screenImage(project, chosenBusiness.screen, 'desktop'))} sizes="280px" width={1600} height={1000} loading="lazy" decoding="async" alt="" />
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
