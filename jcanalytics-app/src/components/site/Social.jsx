// ============================================================================
//  src/components/site/Social.jsx
//  Community manager y edición de video, mostrados en vez de descritos:
//    · un teléfono con un reel que se edita solo (cortes, subtítulos, música)
//      y la línea de tiempo debajo moviéndose en sincronía;
//    · el calendario de contenido de una semana;
//    · un reporte de Meta Ads con las métricas que sí importan;
//    · un chat de atención respondido en minutos.
//  Todo es demo (se dice en pantalla). La cara del servicio es Hillary.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { Play, Music2, Captions, Scissors, Heart, MessageCircle, Send, Bookmark, Check, CheckCheck, TrendingUp } from 'lucide-react';
import { byId } from '../../data/team';
import { CTA, Label, MaskLines, Reveal } from './primitives';
import { wa, EASE } from './links';

// eslint (sin plugin de react) no reconoce a `motion` usado solo como <motion.x>.
const _MOTION = motion;

// Escenas del reel: cada una es un "corte" con su propio fondo y texto.
const SCENES = [
  { ms: 2000, bg: 'bg-lime text-ink', kicker: 'Reel · 0:12', text: '3 señales de que tu Excel ya no da más', sub: 'Gancho en los primeros 3 s' },
  { ms: 1800, bg: 'bg-ink text-paper', kicker: '01', text: 'Nadie sabe cuál versión es la buena.', sub: 'Corte seco + subtítulo' },
  { ms: 1800, bg: 'bg-white text-ink', kicker: '02', text: 'El reporte del lunes se arma el domingo.', sub: 'Zoom suave + música' },
  { ms: 1800, bg: 'bg-ink text-paper', kicker: '03', text: 'Si esa persona se enferma, se detiene todo.', sub: 'B-roll + voz en off' },
  { ms: 2200, bg: 'bg-lime text-ink', kicker: 'Cierre', text: 'Lo convertimos en un sistema. Escribinos.', sub: 'Llamado a la acción' },
];
const TOTAL_MS = SCENES.reduce((n, s) => n + s.ms, 0);

const TRACKS = [
  { name: 'Video', icon: Scissors, clips: [[0, 0.22], [0.22, 0.42], [0.42, 0.61], [0.61, 0.8], [0.8, 1]] },
  { name: 'Voz', icon: Play, clips: [[0.04, 0.2], [0.24, 0.4], [0.44, 0.6], [0.63, 0.78]] },
  { name: 'Música', icon: Music2, clips: [[0, 1]] },
  { name: 'Subtítulos', icon: Captions, clips: [[0.02, 0.21], [0.23, 0.41], [0.43, 0.6], [0.62, 0.79], [0.81, 0.98]] },
];

const WEEK = [
  { d: 'L', items: [{ t: 'Reel', c: 'bg-lime text-ink' }] },
  { d: 'M', items: [{ t: 'Historia', c: 'bg-paper/15' }, { t: 'Anuncio', c: 'bg-orange-400 text-ink' }] },
  { d: 'M', items: [{ t: 'Carrusel', c: 'bg-paper/15' }] },
  { d: 'J', items: [{ t: 'Reel', c: 'bg-lime text-ink' }, { t: 'Historia', c: 'bg-paper/15' }] },
  { d: 'V', items: [{ t: 'Post', c: 'bg-paper/15' }] },
  { d: 'S', items: [{ t: 'Historia', c: 'bg-paper/15' }] },
  { d: 'D', items: [{ t: 'Reporte', c: 'bg-white text-ink' }] },
];

const KPIS = [
  { label: 'Alcance', value: '48,2 k', delta: '+31 %' },
  { label: 'Clics al WhatsApp', value: '1.930', delta: '+18 %' },
  { label: 'Costo por clic', value: '₡96', delta: '−22 %' },
  { label: 'Conversaciones', value: '214', delta: '+40 %' },
];
const BARS = [34, 41, 38, 52, 61, 58, 74];

const Phone = ({ reduce, playing }) => {
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 del reel completo

  useEffect(() => {
    if (reduce || !playing) return undefined;
    let raf;
    const start = performance.now();
    let last = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      // ~20 fps es suficiente para la barra y el cabezal; evita re-render por frame.
      if (now - last < 50) return;
      last = now;
      const t = (now - start) % TOTAL_MS;
      let acc = 0;
      let idx = 0;
      for (let k = 0; k < SCENES.length; k += 1) {
        if (t < acc + SCENES[k].ms) { idx = k; break; }
        acc += SCENES[k].ms;
      }
      setI(idx);
      setProgress(t / TOTAL_MS);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduce, playing]);

  const scene = SCENES[i];

  return (
    <div className="flex flex-col gap-4">
      <div className="mx-auto w-[min(100%,17rem)] rounded-[2.4rem] bg-neutral-950 p-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        <div className="relative rounded-[1.9rem] overflow-hidden bg-ink aspect-[9/17]">
          {/* Escena */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={i}
              initial={reduce ? false : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`absolute inset-0 flex flex-col justify-between p-5 pt-12 ${scene.bg}`}
            >
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-60">{scene.kicker}</span>
              <div>
                <p className="font-display text-[1.55rem] font-semibold tracking-[-0.03em] leading-[1.02]">{scene.text}</p>
              </div>
              {/* Subtítulo "quemado" */}
              <div className="mb-24">
                <span className="inline-block rounded-md bg-black/80 text-white px-2 py-1 text-[11px] font-semibold leading-tight">
                  {scene.text}
                </span>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Barra de progreso del reel */}
          <div className="absolute top-3 inset-x-3 flex gap-1">
            {SCENES.map((s, k) => {
              const before = SCENES.slice(0, k).reduce((n, x) => n + x.ms, 0) / TOTAL_MS;
              const w = s.ms / TOTAL_MS;
              const fill = reduce ? 1 : Math.min(1, Math.max(0, (progress - before) / w));
              return (
                <span key={k} className="h-0.5 flex-1 rounded-full bg-white/30 overflow-hidden">
                  <span className="block h-full bg-white" style={{ width: `${fill * 100}%` }} />
                </span>
              );
            })}
          </div>

          {/* Overlay estilo reel: cuenta + acciones */}
          <div className="absolute left-4 bottom-4 right-14 text-white drop-shadow">
            <div className="flex items-center gap-2">
              <img src={import.meta.env.BASE_URL + 'LogoMark.webp'} alt="" width={162} height={200} className="w-5 h-auto bg-white rounded-full p-0.5" />
              <span className="text-[12px] font-semibold">jcanalytics</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/50">Seguir</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug opacity-90">Editado por Hillary · subtítulos, música y CTA</p>
            <p className="mt-1 flex items-center gap-1 text-[10px] opacity-75"><Music2 size={11} /> audio original · jcanalytics</p>
          </div>
          <div className="absolute right-3 bottom-6 flex flex-col items-center gap-3 text-white">
            {[Heart, MessageCircle, Send, Bookmark].map((I, k) => (
              <I key={k} size={20} strokeWidth={2.2} className={k === 0 && i === SCENES.length - 1 ? 'fill-red-500 text-red-500' : ''} />
            ))}
          </div>
        </div>
      </div>

      {/* Línea de tiempo del editor, sincronizada con el reel */}
      <div className="rounded-2xl bg-neutral-950 ring-1 ring-white/10 p-3 sm:p-4">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45 mb-3">
          <span>Edición · reel 9:16</span>
          <span className="tabular-nums">{reduce ? '0:12' : `0:${String(Math.floor((progress * TOTAL_MS) / 1000)).padStart(2, '0')}`} / 0:{String(Math.round(TOTAL_MS / 1000)).padStart(2, '0')}</span>
        </div>
        <div className="relative space-y-1.5">
          {TRACKS.map((t) => {
            const Icon = t.icon;
            return (
              <div key={t.name} className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] text-paper/60"><Icon size={12} /> {t.name}</span>
                <div className="relative h-5 rounded-md bg-white/5">
                  {t.clips.map(([a, b], k) => (
                    <span
                      key={k}
                      className={`absolute top-0.5 bottom-0.5 rounded ${t.name === 'Música' ? 'bg-violet-400/60' : t.name === 'Voz' ? 'bg-orange-400/70' : t.name === 'Subtítulos' ? 'bg-paper/40' : 'bg-lime/80'}`}
                      style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {/* Cabezal */}
          <span
            aria-hidden="true"
            className="absolute top-0 bottom-0 w-px bg-white pointer-events-none"
            style={{ left: `calc(5.5rem + 0.5rem + (100% - 6rem) * ${reduce ? 0.35 : progress})` }}
          >
            <span className="absolute -top-1 -left-1 w-2 h-2 rounded-sm bg-white" />
          </span>
        </div>
      </div>
    </div>
  );
};

const Social = () => {
  const reduce = useReducedMotion();
  const ref = useRef(null);
  const inView = useInView(ref, { margin: '-10% 0px -10% 0px' });
  const hillary = byId('hillary');

  return (
    <section id="redes" ref={ref} className="scroll-mt-24 bg-ink text-paper py-20 sm:py-32 rounded-t-[2rem] sm:rounded-t-[3rem] -mt-8 relative z-30 overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 sm:mb-16">
          <div>
            <Label className="text-paper/45">(04) Redes sociales</Label>
            <h2 className="mt-4 font-display font-semibold tracking-[-0.04em] leading-[0.92] text-[clamp(2.6rem,7vw,6rem)]">
              <MaskLines lines={['Tus redes,', <span key="b" className="font-serif italic font-normal text-lime">con criterio.</span>]} />
            </h2>
          </div>
          <Reveal delay={0.2} className="max-w-sm">
            <p className="text-paper/55 text-lg leading-snug">
              Community manager, diseño publicitario, video y Meta Ads. Hillary crea; el sistema publica, responde y mide.
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/35">Lo de abajo es una demo · así se ve la entrega</p>
          </Reveal>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,19rem)_1fr] gap-8 lg:gap-12 items-start">
          {/* Teléfono + editor */}
          <Reveal>
            <Phone reduce={reduce} playing={inView} />
          </Reveal>

          {/* Calendario · Meta Ads · Atención */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            {/* Calendario */}
            <Reveal delay={0.05} className="md:col-span-2 rounded-[1.5rem] bg-white/5 ring-1 ring-white/10 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <Label className="text-paper/50">Calendario de contenido · semana 1</Label>
                <span className="font-mono text-[11px] text-lime">12 piezas / mes</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {WEEK.map((day, k) => (
                  <div key={k} className={`rounded-xl p-1.5 sm:p-2 min-h-[5.5rem] ${k === 3 ? 'bg-white/10 ring-1 ring-lime/50' : 'bg-white/[0.03]'}`}>
                    <div className="font-mono text-[10px] text-paper/40 mb-1.5">{day.d}</div>
                    <div className="space-y-1">
                      {day.items.map((it) => (
                        <span key={it.t} className={`block rounded-md px-1.5 py-1 text-[10px] sm:text-[11px] font-semibold leading-none truncate ${it.c}`}>{it.t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[13px] text-paper/50">Publicado a la hora que rinde en tu cuenta, no a la que alcanzó.</p>
            </Reveal>

            {/* Meta Ads */}
            <Reveal delay={0.1} className="rounded-[1.5rem] bg-white/5 ring-1 ring-white/10 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <Label className="text-paper/50">Meta Ads · reporte semanal</Label>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-lime"><TrendingUp size={12} /> optimizado</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {KPIS.map((k) => (
                  <div key={k.label}>
                    <div className="text-[11px] text-paper/45">{k.label}</div>
                    <div className="font-display text-2xl font-semibold tracking-tight leading-none mt-0.5">{k.value}</div>
                    <div className={`font-mono text-[11px] mt-0.5 ${k.delta.startsWith('−') ? 'text-lime' : 'text-lime'}`}>{k.delta}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-end gap-1.5 h-16" aria-hidden="true">
                {BARS.map((h, k) => (
                  <motion.span
                    key={k}
                    className={`flex-1 rounded-t-md ${k === BARS.length - 1 ? 'bg-lime' : 'bg-paper/25'}`}
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: reduce ? 0 : 0.9, delay: k * 0.06, ease: EASE }}
                  />
                ))}
              </div>
              <p className="mt-3 text-[13px] text-paper/50">El presupuesto va donde hay conversaciones, no likes. Se ajusta cada semana.</p>
            </Reveal>

            {/* Atención al cliente */}
            <Reveal delay={0.15} className="rounded-[1.5rem] bg-white/5 ring-1 ring-white/10 p-5 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4">
                <Label className="text-paper/50">Atención a clientes</Label>
                <span className="font-mono text-[11px] text-lime">respondido en 4 min</span>
              </div>
              <div className="space-y-2.5 text-[13px] leading-snug flex-1">
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2.5">
                  ¿Tienen espacio el sábado en la tarde? 🙏
                  <span className="block mt-1 font-mono text-[10px] text-paper/40">10:12</span>
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-lime text-ink px-3.5 py-2.5">
                  ¡Sí! A las 3:00 p. m. queda perfecto. Reservá aquí 👉 <span className="underline">barberxcr.com/reservar</span>
                  <span className="mt-1 flex items-center gap-1 justify-end font-mono text-[10px] text-ink/60">10:16 <CheckCheck size={12} /></span>
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2.5">
                  Listo, reservado. ¡Gracias!
                  <span className="block mt-1 font-mono text-[10px] text-paper/40">10:19</span>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
                <img src={hillary.avatar} alt={hillary.name} width={400} height={400} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover ring-2 ring-lime" />
                <p className="text-[13px] text-paper/70 leading-snug">
                  <span className="font-semibold text-paper">{hillary.name}</span> responde comentarios y mensajes con el tono de tu marca.
                </p>
              </div>
            </Reveal>

            {/* Qué incluye + CTA */}
            <Reveal delay={0.2} className="md:col-span-2 rounded-[1.5rem] bg-lime text-ink p-5 sm:p-7 grid md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <Label className="text-ink/60">Plan mensual · qué incluye</Label>
                <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[15px] font-medium">
                  {['Calendario y diseño publicitario', 'Reels y videos cortos editados', 'Publicación y respuesta a mensajes', 'Meta Ads con seguimiento semanal', 'Reporte mensual con métricas', 'Una persona real: Hillary'].map((b) => (
                    <li key={b} className="flex items-center gap-2"><Check size={16} strokeWidth={3} className="shrink-0" />{b}</li>
                  ))}
                </ul>
              </div>
              <CTA href={wa('Hola Hillary, quiero un plan de redes sociales para mi negocio.')} variant="ink" size="lg" className="justify-self-start md:justify-self-end">
                Quiero mi plan de redes
              </CTA>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Social;
