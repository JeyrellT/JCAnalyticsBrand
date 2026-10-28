import { t } from '../../i18n/locale';
// ============================================================================
//  src/components/site/Social.jsx
//  Community manager y contenido, con piezas reales publicadas para clientes:
//    · un teléfono que recorre posts reales (La Burrada, Maison Valcour)
//      con la línea de tiempo del editor sincronizada;
//    · el calendario de una semana con las piezas de verdad;
//    · las estadísticas reales de Instagram de La Burrada (30 días);
//    · fotos de producción tomadas para la marca.
//  Las imágenes viven en public/marketing/. La cara del servicio es Hillary.
// ============================================================================
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion';
import { Play, Pause, Music2, Captions, Scissors, Heart, MessageCircle, Send, Bookmark, Check, Camera, TrendingUp } from 'lucide-react';
import { byId } from '../../data/team';
import { Label, MaskLines, Reveal } from './primitives';
import { EASE } from './links';
import ContactCTA from './ContactCTA';
import MobileRail from './MobileRail';

// eslint (sin plugin de react) no reconoce a `motion` usado solo como <motion.x>.
const _MOTION = motion;

const asset = (file) => `${import.meta.env.BASE_URL}marketing/${file}.webp`;

// Escenas del reel: piezas reales, publicadas en las cuentas de los clientes.
const SCENES = [
  { ms: 2200, file: 'lb-post-papas-frente', account: 'laburradacr', caption: t("Post de menú · papas cargadas", "Menu post · loaded fries") },
  { ms: 2000, file: 'lb-foto-burritos', account: 'laburradacr', caption: t("Foto de producto tomada en el local", "Product photo shot on site") },
  { ms: 2000, file: 'lb-post-chifrijo', account: 'laburradacr', caption: t("Post de menú · chifrijo", "Menu post · chifrijo") },
  { ms: 2000, file: 'valcour-post', account: 'maisonvalcour', caption: t("Pieza para taller automotriz", "Post for an auto shop") },
  { ms: 2200, file: 'lb-post-papas-arriba', account: 'laburradacr', caption: t("Post con llamado a pedir en línea", "Post that drives online orders") },
];
const TOTAL_MS = SCENES.reduce((n, s) => n + s.ms, 0);

const TRACKS = [
  { name: 'Video', icon: Scissors, clips: [[0, 0.22], [0.22, 0.42], [0.42, 0.61], [0.61, 0.8], [0.8, 1]] },
  { name: t("Voz", "Voice"), icon: Play, clips: [[0.04, 0.2], [0.24, 0.4], [0.44, 0.6], [0.63, 0.78]] },
  { name: t("Música", "Music"), icon: Music2, clips: [[0, 1]] },
  { name: t("Subtítulos", "Captions"), icon: Captions, clips: [[0.02, 0.21], [0.23, 0.41], [0.43, 0.6], [0.62, 0.79], [0.81, 0.98]] },
];

const WEEK = [
  { d: t('L', 'M'), file: 'lb-post-papas-frente', items: [{ t: 'Post', c: 'bg-lime text-ink' }] },
  { d: t('M', 'T'), file: 'lb-foto-caja', items: [{ t: t("Historia", "Story"), c: 'bg-paper/15' }, { t: t("Anuncio", "Ad"), c: 'bg-orange-400 text-ink' }] },
  { d: t('M', 'W'), file: 'lb-post-chifrijo', items: [{ t: 'Post', c: 'bg-paper/15' }] },
  { d: t('J', 'T'), file: 'lb-foto-burritos', items: [{ t: 'Reel', c: 'bg-lime text-ink' }, { t: t("Historia", "Story"), c: 'bg-paper/15' }] },
  { d: t('V', 'F'), file: 'lb-post-papas-diagonal', items: [{ t: 'Post', c: 'bg-paper/15' }] },
  { d: 'S', file: 'lb-post-papas-arriba', items: [{ t: t("Historia", "Story"), c: 'bg-paper/15' }] },
  { d: t('D', 'S'), file: 'lb-metricas-visualizaciones', items: [{ t: t("Reporte", "Report"), c: 'bg-white text-ink' }] },
];

// Estadísticas reales de la cuenta de Instagram de La Burrada (últimos 30 días,
// captura de Meta Business Suite). Si se actualizan, cambiar también las capturas.
const KPIS = [
  { label: t("Visualizaciones", "Views"), value: t("12.154", "12,154") },
  { label: t("Espectadores", "Viewers"), value: '819' },
  { label: t("Actividad del perfil", "Profile activity"), value: '446' },
  { label: t("Seguidores", "Followers"), value: '506' },
];

const Phone = ({ reduce, playing }) => {
  const [i, setI] = useState(0);
  const [progress, setProgress] = useState(0); // 0..1 del reel completo
  const elapsedRef = useRef(0);

  useEffect(() => {
    if (reduce || !playing) return undefined;
    let raf;
    const start = performance.now() - elapsedRef.current;
    let last = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      // ~20 fps es suficiente para la barra y el cabezal; evita re-render por frame.
      if (now - last < 50) return;
      last = now;
      const t = (now - start) % TOTAL_MS;
      elapsedRef.current = t;
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
    <div className="social-editing-desk flex flex-col gap-4">
      <div className="social-phone mx-auto w-[min(100%,17rem)] rounded-[2.4rem] bg-neutral-950 p-2 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        <div className="relative rounded-[1.9rem] overflow-hidden bg-ink aspect-[9/17]">
          {/* Escena */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={i}
              initial={reduce ? false : { opacity: 0, scale: 1.04 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="social-reel__scene social-reel__scene--real absolute inset-0 bg-black"
            >
              <img className="social-reel__photo" src={asset(scene.file)} alt={scene.caption} width={720} height={900} loading="lazy" decoding="async" />
            </motion.div>
          </AnimatePresence>

          {/* Barra de progreso del reel */}
          <div className="absolute top-3 inset-x-3 flex gap-1">
            {SCENES.map((s, k) => {
              const before = SCENES.slice(0, k).reduce((n, x) => n + x.ms, 0) / TOTAL_MS;
              const w = s.ms / TOTAL_MS;
              const fill = reduce ? 0 : Math.min(1, Math.max(0, (progress - before) / w));
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
              <span className="grid place-items-center w-5 h-5 rounded-full bg-white text-ink text-[9px] font-bold uppercase">{scene.account[0]}</span>
              <span className="text-[12px] font-semibold">{scene.account}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded border border-white/50">{t("Seguir", "Follow")}</span>
            </div>
            <p className="mt-1.5 text-[11px] leading-snug opacity-90">{scene.caption}</p>
            <p className="mt-1 flex items-center gap-1 text-[10px] opacity-75"><Camera size={11} /> {t("pieza publicada · JC Analytics", "published piece · JC Analytics")}</p>
          </div>
          <div className="absolute right-3 bottom-6 flex flex-col items-center gap-3 text-white">
            {[Heart, MessageCircle, Send, Bookmark].map((I, k) => (
              <I key={k} size={20} strokeWidth={2.2} className={k === 0 && i === SCENES.length - 1 ? 'fill-red-500 text-red-500' : ''} />
            ))}
          </div>
        </div>
      </div>

      {/* Línea de tiempo del editor, sincronizada con el reel */}
      <div className="social-timeline rounded-2xl bg-neutral-950 ring-1 ring-white/10 p-3 sm:p-4">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-paper/45 mb-3">
          <span>{t("Edición · piezas reales", "Editing · real pieces")}</span>
          <span className="tabular-nums">{reduce ? '0:00' : `0:${String(Math.floor((progress * TOTAL_MS) / 1000)).padStart(2, '0')}`} / 0:{String(Math.round(TOTAL_MS / 1000)).padStart(2, '0')}</span>
        </div>
        <div className="relative space-y-1.5">
          {TRACKS.map((track) => {
            const Icon = track.icon;
            return (
              <div key={track.name} className="grid grid-cols-[5.5rem_1fr] items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] text-paper/60"><Icon size={12} /> {track.name}</span>
                <div className="relative h-5 rounded-md bg-white/5">
                  {track.clips.map(([a, b], k) => (
                    <span
                      key={k}
                      className={`timeline-clip timeline-clip--${track.name === 'Video' ? 'video' : 'audio'} absolute top-0.5 bottom-0.5 rounded ${track.name === t("Música", "Music") ? 'bg-violet-400/60' : track.name === t("Voz", "Voice") ? 'bg-orange-400/70' : track.name === t("Subtítulos", "Captions") ? 'bg-paper/40' : 'bg-lime/80'}`}
                      style={{ left: `${a * 100}%`, width: `${(b - a) * 100}%` }}
                    >{track.name === 'Video' ? <img src={asset(SCENES[k].file)} alt="" loading="lazy" decoding="async" /> : track.name === t("Música", "Music") || track.name === t("Voz", "Voice") ? <svg viewBox="0 0 120 20" preserveAspectRatio="none" aria-hidden="true">{Array.from({ length: 32 }, (_, n) => { const height = 3 + (n * 7 % 13); return <path key={n} d={`M${n * 4} ${10 - height / 2}v${height}`} stroke="currentColor" strokeWidth="1.2" />; })}</svg> : null}</span>
                  ))}
                </div>
              </div>
            );
          })}
          {/* Cabezal */}
          <span
            aria-hidden="true"
            className="absolute top-0 bottom-0 w-px bg-white pointer-events-none"
            style={{ left: `calc(4.6rem + 0.5rem + (100% - 5.1rem) * ${reduce ? 0 : progress})` }}
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
  const [paused, setPaused] = useState(false);

  return (
    <section id="redes" ref={ref} className="social-premium social-art-direction scroll-mt-24 bg-ink text-paper py-20 sm:py-32 rounded-t-[2rem] sm:rounded-t-[3rem] -mt-8 relative z-30 overflow-hidden">
      <svg className="social-orbit-mark" viewBox="0 0 500 500" fill="none" aria-hidden="true">{[0, 45, 90, 135].map(angle => <ellipse key={angle} cx="250" cy="250" rx="108" ry="235" transform={`rotate(${angle} 250 250)`} stroke="currentColor" />)}</svg>
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12 sm:mb-16">
          <div>
            <Label className="text-paper/70">{t("04 / Marketing digital · el siguiente impulso", "04 / Digital marketing · the next step")}</Label>
            <h2 className="mt-4 font-display font-semibold tracking-[-0.04em] leading-[0.92] text-[clamp(2.6rem,7vw,6rem)]">
              <MaskLines lines={[t("Tus redes,", "Your social media,"), <span key="b" className="font-serif italic font-normal text-lime">{t("con criterio.", "with purpose.")}</span>]} />
            </h2>
          </div>
          <Reveal delay={0.2} className="max-w-sm">
            <p className="text-paper/55 text-lg leading-snug">
             {t("Tu sistema ya tiene una base. Ahora, hagamos que más personas lo conozcan: contenido, community manager, diseño publicitario, video y Meta Ads.", "Your system has a foundation. Now let's help more people discover it: content, community management, ad design, video and Meta Ads.")}
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/35">{t("Trabajo real · La Burrada Street Food y Maison Valcour", "Real work · La Burrada Street Food and Maison Valcour")}</p>
            {!reduce && <button type="button" onClick={() => setPaused((value) => !value)} aria-pressed={paused} className="demo-pause demo-pause--dark">{paused ? <Play size={14} aria-hidden="true" /> : <Pause size={14} aria-hidden="true" />}{paused ? t("Reanudar", "Resume") : t("Pausar", "Pause")}</button>}
          </Reveal>
        </div>

        <div className="social-production grid grid-cols-1 lg:grid-cols-[minmax(0,19rem)_1fr] gap-8 lg:gap-12 items-start">
          {/* Teléfono + editor */}
          <Reveal>
            <Phone reduce={reduce} playing={inView && !paused} />
          </Reveal>

          {/* Calendario · Meta Ads · Atención */}
          <div className="social-delivery grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            <MobileRail className="social-delivery__examples" label={t("Trabajo de marketing real", "Real marketing work")}>
            {/* Calendario */}
            <Reveal delay={0.05} className="social-calendar md:col-span-2 rounded-[1.5rem] bg-white/5 ring-1 ring-white/10 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <Label className="text-paper/50">{t("Calendario · una semana de La Burrada", "Calendar · one week at La Burrada")}</Label>
                <span className="font-mono text-[11px] text-lime">{t("12 piezas / mes", "12 pieces / month")}</span>
              </div>
              <div className="social-calendar__week grid grid-cols-7 gap-1.5 sm:gap-2">
                {WEEK.map((day, k) => (
                  <div key={k} className={`rounded-xl p-1.5 sm:p-2 min-h-[5.5rem] ${k === 3 ? 'bg-white/10 ring-1 ring-lime/50' : 'bg-white/[0.03]'}`}>
                    <div className="font-mono text-[10px] text-paper/40 mb-1.5">{day.d}</div>
                    <div className="campaign-tile campaign-tile--real"><img src={asset(day.file)} alt="" width={720} height={900} loading="lazy" decoding="async" /></div>
                    <div className="space-y-1">
                      {day.items.map((it) => (
                        <span key={it.t} className={`block rounded-md px-1.5 py-1 text-[10px] sm:text-[11px] font-semibold leading-none truncate ${it.c}`}>{it.t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[13px] text-paper/50">{t("Publicado a la hora que rinde en tu cuenta, no a la que alcanzó.", "Published when your audience is most active.")}</p>
            </Reveal>

            {/* Resultados reales */}
            <Reveal delay={0.1} className="social-report rounded-[1.5rem] bg-white/5 ring-1 ring-white/10 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3 mb-4">
                <Label className="text-paper/50">{t("Instagram · La Burrada · 30 días", "Instagram · La Burrada · 30 days")}</Label>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-lime"><TrendingUp size={12} /> {t("datos reales", "real data")}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {KPIS.map((k) => (
                  <div key={k.label}>
                    <div className="text-[11px] text-paper/45">{k.label}</div>
                    <div className="font-display text-2xl font-semibold tracking-tight leading-none mt-0.5">{k.value}</div>
                  </div>
                ))}
              </div>
              <figure className="social-report__proof mt-5">
                <img src={asset('lb-metricas-visualizaciones')} width={900} height={854} loading="lazy" decoding="async" alt={t("Captura de las estadísticas de Instagram de La Burrada: 12.154 visualizaciones y 819 espectadores en 30 días.", "Screenshot of La Burrada’s Instagram insights: 12,154 views and 819 viewers in 30 days.")} />
                <figcaption>{t("Captura de Meta Business Suite, sin retoques.", "Meta Business Suite screenshot, unedited.")}</figcaption>
              </figure>
              <p className="mt-3 text-[13px] text-paper/50">{t("El 79,8 % de las visualizaciones vino de historias: por eso el calendario las prioriza.", "79.8% of views came from stories, so the calendar prioritizes them.")}</p>
            </Reveal>

            {/* Producción de contenido */}
            <Reveal delay={0.15} className="social-community rounded-[1.5rem] bg-white/5 ring-1 ring-white/10 p-5 sm:p-6 flex flex-col">
              <div className="flex items-center justify-between gap-3 mb-4">
                <Label className="text-paper/50">{t("Sesión de fotos en el local", "On-site photo session")}</Label>
                <span className="font-mono text-[11px] text-lime">{t("sin banco de imágenes", "no stock photos")}</span>
              </div>
              <div className="social-shoot grid grid-cols-2 gap-2.5 flex-1">
                <img src={asset('lb-foto-burritos')} width={640} height={1138} loading="lazy" decoding="async" alt={t("Burritos de La Burrada fotografiados en mano para redes.", "La Burrada burritos photographed in hand for social media.")} />
                <img src={asset('lb-foto-caja')} width={640} height={1138} loading="lazy" decoding="async" alt={t("Caja de papas de La Burrada vista desde arriba.", "La Burrada fries box seen from above.")} />
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-3">
                <img src={hillary.avatar} alt={hillary.name} width={400} height={400} loading="lazy" decoding="async" className="w-10 h-10 rounded-full object-cover ring-2 ring-lime" />
                <p className="text-[13px] text-paper/70 leading-snug">
                  <span className="font-semibold text-paper">{hillary.name}</span> {t("toma las fotos, publica y responde mensajes con el tono de tu marca.", "takes the photos, publishes and replies to messages in your brand's voice.")}
                </p>
              </div>
            </Reveal>

            {/* Qué incluye + CTA */}
            </MobileRail>
            <Reveal delay={0.2} className="md:col-span-2 rounded-[1.5rem] bg-lime text-ink p-5 sm:p-7 grid md:grid-cols-[1fr_auto] gap-6 items-center">
              <div>
                <Label className="text-ink/60">{t("Plan mensual · qué incluye", "Monthly plan · what's included")}</Label>
                <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-[15px] font-medium">
                  {[t("Calendario y diseño publicitario", "Content calendar and ad design"), t("Reels y videos cortos editados", "Edited reels and short videos"), t("Publicación y respuesta a mensajes", "Publishing and message replies"), t("Meta Ads con seguimiento semanal", "Meta Ads with weekly monitoring"), t("Reporte mensual con métricas", "Monthly metrics report"), t("Una persona real: Hillary", "A real person: Hillary")].map((b) => (
                    <li key={b} className="flex items-center gap-2"><Check size={16} strokeWidth={3} className="shrink-0" />{b}</li>
                  ))}
                </ul>
              </div>
              <ContactCTA need="Marketing digital" source={t("Marketing · contenido, redes y campañas", "Marketing · content, social media and campaigns")} variant="ink" size="lg" className="justify-self-start md:justify-self-end">
               {t("Armemos mi plan de marketing", "Let's build my marketing plan")}
              </ContactCTA>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Social;
