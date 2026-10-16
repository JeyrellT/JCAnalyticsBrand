import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CheckCheck, Fingerprint, RotateCcw, Sparkles, Sprout, Telescope } from 'lucide-react';
import { formatMoney } from '../lib/format.js';
import { cx } from '../components/ui.jsx';
import '../styles/investor-playbook.css';

const LESSONS = [
  {
    id: 'confirmado', title: 'La doble confirmación', subtitle: 'Cuándo un movimiento cuenta.', icon: CheckCheck,
    question: 'Hay un aporte pendiente. ¿Ya se suma a tu capital confirmado?',
    options: ['Sí, desde que se registra.', 'Cuando lo confirman ambas partes.', 'Solo si está en colones.'], answer: 1,
    explanation: 'Un registro pendiente todavía espera una respuesta. Tus cifras de capital incluyen únicamente movimientos confirmados por las dos partes.',
    takeaway: 'Pendiente y confirmado son dos momentos distintos.',
  },
  {
    id: 'neto', title: 'El neto, sin misterio', subtitle: 'Dos cifras. Una resta.', icon: Sprout,
    question: '¿Qué operación explica el neto de tu cuenta?',
    options: ['Sumar aportes y retornos.', 'Retornos confirmados menos aportes confirmados.', 'Sumar todos los movimientos pendientes.'], answer: 1,
    explanation: 'El neto compara lo recibido con lo aportado. Los retornos pueden incluir capital y ganancias; cada concepto se muestra por separado. El neto de caja no es la utilidad del negocio.',
    takeaway: 'El neto describe lo registrado hasta ahora.',
  },
  {
    id: 'participacion', title: 'Tu parte del mapa', subtitle: 'Dónde encaja tu aporte.', icon: Telescope,
    question: '¿Qué representa la participación que muestra cada inversión?',
    options: ['El retorno que recibiré en el futuro.', 'Mi lugar en un ranking de inversionistas.', 'Mi aporte confirmado dividido por el capital confirmado del grupo.'], answer: 2,
    explanation: 'Es la proporción de tus aportes confirmados dentro del capital aportado a esa inversión. Se calcula por inversión y no indica un retorno futuro.',
    takeaway: 'Tu participación es una proporción del capital aportado.',
  },
];

function readCompleted(key) {
  if (!key) return [];
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(stored) ? LESSONS.map((lesson) => lesson.id).filter((id) => stored.includes(id)) : [];
  } catch { return []; }
}

function PlaybookSession({ portfolio, userId }) {
  const storageKey = userId ? `jcp:investor:playbook:${userId}` : null;
  const [completed, setCompleted] = useState(() => readCompleted(storageKey));
  const [active, setActive] = useState(null);
  const [answers, setAnswers] = useState({});
  const [celebrate, setCelebrate] = useState(false);
  const questionHeading = useRef(null);
  const focusNextQuestion = useRef(false);
  useEffect(() => {
    if (!focusNextQuestion.current || !questionHeading.current) return;
    focusNextQuestion.current = false;
    questionHeading.current.focus({ preventScroll: true });
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.querySelector('.investor-club[data-motion="paused"]');
    questionHeading.current.scrollIntoView({ block: 'nearest', behavior: still ? 'instant' : 'smooth' });
  }, [active]);
  const lesson = LESSONS.find((item) => item.id === active);
  const choice = lesson ? answers[lesson.id] : undefined;
  const solved = lesson && completed.includes(lesson.id);
  const allDone = completed.length === LESSONS.length;
  const remember = (next) => {
    setCompleted(next);
    if (storageKey) { try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Optional learning still works. */ } }
  };
  function answer(index) {
    setAnswers((previous) => ({ ...previous, [lesson.id]: index }));
    if (index !== lesson.answer || solved) return;
    const next = [...completed, lesson.id];
    remember(next);
    if (next.length === LESSONS.length) setCelebrate(true);
  }
  function reset() {
    remember([]); setAnswers({}); setActive(null); setCelebrate(false);
  }
  const nextLesson = LESSONS.find((item) => !completed.includes(item.id) && item.id !== active);
  return (
    <section className="investor-playbook" aria-labelledby="ip-title">
      <header className="ip-heading">
        <div><p className="ip-eyebrow"><Sparkles size={14} />EL RINCÓN CURIOSO</p><h2 id="ip-title">Tu capital, sin idioma raro.</h2><p>Tres mini retos para leer tu cuenta con otros ojos. Elegí por dónde empezar.</p></div>
        <span className="ip-progress" aria-label={`${completed.length} de 3 conceptos descubiertos`}><span>{String(completed.length).padStart(2, '0')}</span><span>/ 03<br /><small>descubiertos</small></span></span>
      </header>
      <div className="ip-deck" role="group" aria-label="Elegir un mini reto">
        {LESSONS.map((item, index) => {
          const done = completed.includes(item.id);
          return <button type="button" key={item.id} className={cx('ip-card', `ip-card-${index}`, done && 'is-complete')} aria-pressed={active === item.id} aria-controls="ip-question" onClick={() => setActive((current) => current === item.id ? null : item.id)}>
            <span className="ip-card-top"><span>IDEA / 0{index + 1}</span>{done ? <Check size={17} /> : <ArrowRight size={17} />}</span>
            <span className="ip-card-art" aria-hidden="true"><span /><span /><span /><item.icon size={39} strokeWidth={1.35} /></span>
            <span className="ip-card-title">{item.title}</span><span className="ip-card-subtitle">{done ? 'Descubierto. Podés volver a explorarlo.' : item.subtitle}</span>
          </button>;
        })}
      </div>
      <div id="ip-question" hidden={!lesson}>
        {lesson && <div className="ip-question-panel">
          <div className="ip-question-copy"><span className="ip-eyebrow">{solved ? 'IDEA DESCUBIERTA' : 'PONÉ A PRUEBA TU INTUICIÓN'}</span><h3 ref={questionHeading} tabIndex={-1}>{lesson.question}</h3><span className="ip-small-note">Podés intentarlo las veces que quieras.</span></div>
          <div className="ip-answer-area">
            <div className="ip-options" role="group" aria-label={`Respuestas: ${lesson.title}`}>
              {lesson.options.map((option, index) => <button type="button" key={option} aria-pressed={solved ? index === lesson.answer : choice === index} className={cx('ip-option', solved && index === lesson.answer && 'is-correct', !solved && choice === index && 'is-retry')} onClick={() => answer(index)} disabled={Boolean(solved)}><span>{String.fromCharCode(65 + index)}</span><span>{option}</span>{solved && index === lesson.answer && <Check size={17} />}</button>)}
            </div>
            <div className="ip-feedback" role="status" aria-live="polite">
              {solved ? <><p><CheckCheck size={17} /><strong>¡Eso es! Una idea más en tu mapa.</strong></p><p>{lesson.explanation}</p>
                {lesson.id === 'neto' && <div className="ip-equation" aria-label="El neto de tu cuenta"><span><small>Retornos</small>{formatMoney(portfolio.returned_crc, 'CRC')}</span><b>−</b><span><small>Aportes</small>{formatMoney(portfolio.contributed_crc, 'CRC')}</span><b>=</b><span><small>Neto</small>{formatMoney(portfolio.net_crc, 'CRC')}</span></div>}
                <div className="ip-takeaway"><Fingerprint size={20} /><span>{lesson.takeaway}</span></div>
                {nextLesson && <button type="button" className="ip-next" onClick={() => { focusNextQuestion.current = true; setActive(nextLesson.id); }}>Explorar otra idea<ArrowRight size={16} /></button>}
              </> : choice !== undefined ? <p className="ip-try-again">Todavía no. {lesson.id === 'confirmado' ? 'Buscá la respuesta que incluye a las dos partes.' : lesson.id === 'neto' ? 'Pensá en lo que volvió y restale lo que aportaste.' : 'Pensá en la proporción de tu aporte dentro del grupo.'} Probá otra vez.</p> : null}
            </div>
          </div>
        </div>}
      </div>
      {allDone && <div className={cx('ip-finish', celebrate && 'ip-celebrate')}>
        {celebrate && <span className="ip-confetti" aria-hidden="true">{Array.from({ length: 12 }, (_, index) => <i key={index} style={{ '--confetti-i': index }} />)}</span>}
        <span className="ip-stamp" aria-hidden="true"><Sparkles size={21} /><span>CAPITAL<br />EN CLARO</span></span>
        <div role="status"><strong>¡Colección completa!</strong><p>Tres conceptos descubiertos. Tu sello «Capital en claro» ya está aquí.</p><small>Un recuerdo de lo aprendido en este navegador.</small></div>
        <button type="button" className="ip-reset" onClick={reset}><RotateCcw size={14} />Volver a jugar</button>
      </div>}
    </section>
  );
}

export default function InvestorPlaybook({ portfolio, userId }) {
  return <PlaybookSession key={userId ?? 'anonymous'} portfolio={portfolio} userId={userId} />;
}
