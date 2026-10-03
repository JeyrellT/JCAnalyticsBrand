import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

const _MOTION = motion;

// These diagrams are illustrations. The adjacent HTML holds the example data
// and its accessible description; no live infrastructure is implied.
export const ArchitectureBlueprint = ({ active }) => {
  const id = useId().replaceAll(':', '');
  const reduce = useReducedMotion();
  const labels = ['Inventario', 'Procesos', 'Administración'];
  return (
    <div className="architecture-blueprint" aria-hidden="true">
      <div className="architecture-blueprint__caption"><span>ARQUITECTURA CONECTADA</span><span>0{active + 1} / 03</span></div>
      <svg viewBox="0 0 600 198" fill="none">
        <defs>
          <linearGradient id={`${id}-top`} x1="90" y1="10" x2="220" y2="140" gradientUnits="userSpaceOnUse"><stop stopColor="#f8fff5" /><stop offset="1" stopColor="#afd3bb" /></linearGradient>
          <linearGradient id={`${id}-side`} x1="160" y1="50" x2="210" y2="160" gradientUnits="userSpaceOnUse"><stop stopColor="#588a70" /><stop offset="1" stopColor="#254d3b" /></linearGradient>
          <linearGradient id={`${id}-metal`} x1="112" y1="55" x2="184" y2="116" gradientUnits="userSpaceOnUse"><stop stopColor="#f3f7e9" /><stop offset=".3" stopColor="#6c8f7a" /><stop offset=".54" stopColor="#dcebdd" /><stop offset="1" stopColor="#719a7d" /></linearGradient>
          <filter id={`${id}-shadow`} x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="2.5" floodColor="#244530" floodOpacity=".2" /></filter>
          <pattern id={`${id}-grid`} width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".65" fill="#376047" opacity=".2" /></pattern>
        </defs>
        <rect width="600" height="198" fill={`url(#${id}-grid)`} />
        <path d="M25 118L142 50L300 139L260 162" stroke="#739780" opacity=".25" />
        <ellipse cx="147" cy="178" rx="105" ry="15" fill="#54785c" opacity=".1" />
        <path d="M146 20V183M42 80H251" stroke="#6d9875" strokeWidth=".6" strokeDasharray="2 4" opacity=".3" />
        {[2, 1, 0].map((level) => <motion.g key={level} filter={`url(#${id}-shadow)`} initial={false} animate={{ y: active === level ? -9 : 0 }} transition={{ duration: reduce ? 0 : .5 }}>
          <path d={`M58 ${79 + level * 23}L146 ${29 + level * 23}L234 ${79 + level * 23}L146 ${129 + level * 23}Z`} fill={active === level ? `url(#${id}-top)` : '#d9e8d9'} stroke="#739b7b" strokeWidth=".8" />
          <path d={`M58 ${79 + level * 23}V${90 + level * 23}L146 ${140 + level * 23}V${129 + level * 23}Z`} fill={active === level ? '#87b39b' : '#9eb5a1'} stroke="#739b7b" strokeWidth=".8" />
          <path d={`M146 ${129 + level * 23}L234 ${79 + level * 23}V${90 + level * 23}L146 ${140 + level * 23}Z`} fill={`url(#${id}-side)`} stroke="#739b7b" strokeWidth=".8" />
          <path d={`M83 ${79 + level * 23}L146 ${43 + level * 23}L209 ${79 + level * 23}L146 ${115 + level * 23}Z`} stroke="#4e785d" strokeWidth=".6" opacity=".5" />
          <path d={`M121 ${79 + level * 23}L146 ${65 + level * 23}L171 ${79 + level * 23}L146 ${94 + level * 23}Z`} fill={`url(#${id}-metal)`} stroke="#f5fff2" strokeWidth=".8" />
          <path d={`M121 ${80 + level * 23}V${84 + level * 23}L146 ${99 + level * 23}L171 ${84 + level * 23}V${79 + level * 23}M146 ${95 + level * 23}V${99 + level * 23}`} stroke="#4e7559" strokeWidth="1" />
          <path d={`M96 ${73 + level * 23}L108 ${66 + level * 23}L130 ${79 + level * 23}M159 ${72 + level * 23}L179 ${60 + level * 23}M160 ${89 + level * 23}L180 ${100 + level * 23}L194 ${92 + level * 23}M133 ${88 + level * 23}L114 ${98 + level * 23}`} stroke={active === level ? '#aa7755' : '#6f9277'} strokeWidth="1" />
          {[[96,73],[179,60],[194,92],[114,98]].map(([x,y])=><circle key={x} cx={x} cy={y + level * 23} r="1.8" fill="#e3eedb" stroke="#708c70" strokeWidth=".6" />)}
          {[[72,79],[146,37],[220,79],[146,120]].map(([x,y],i)=><g key={i}><circle cx={x} cy={y + level * 23} r="1.8" fill="#3b6048" /><path d={`M${x-1} ${y+level*23}h2`} stroke="#d7e8d4" strokeWidth=".6" /></g>)}
          <path d={`M164 ${123 + level * 23}l10 -6M178 ${115 + level * 23}l10 -6M192 ${107 + level * 23}l10 -6`} stroke="#c6e9cc" strokeOpacity=".7" strokeWidth="1.5" />
          <circle cx="218" cy={93 + level * 23} r="2" fill={active === level ? '#fbaf7f' : '#bfe3c5'} />
        </motion.g>)}
        {labels.map((label, index) => <g key={label} opacity={active === index ? 1 : .48}>
          <path d={`M238 ${65 + index * 24}H${268 + index * 12}L${292 + index * 12} ${37 + index * 47}H365`} stroke={active === index ? '#427659' : '#90a994'} strokeWidth={active === index ? 1.5 : 1} />
          <circle cx="366" cy={37 + index * 47} r="3" fill={active === index ? '#da8058' : '#92ac98'} />
          <text x="384" y={40 + index * 47} fill="#294c37" fontSize="12" fontFamily="monospace">{label}</text>
          <text x="384" y={55 + index * 47} fill="#637e69" fontSize="7" fontFamily="monospace">{['DATOS / EXISTENCIAS', 'LÓGICA / OPERACIÓN', 'ACCESOS / CONTROL'][index]}</text>
        </g>)}
        <path d="M23 25H34M28.5 19.5V30.5M571 147H582M576.5 141.5V152.5" stroke="#72997c" strokeWidth=".8" />
      </svg>
    </div>
  );
};

const INPUT_POINTS = [38, 62, 86, 110];

export const IntelligenceAtlas = ({ selected, step }) => {
  const id = useId().replaceAll(':', '');
  const reduce = useReducedMotion();
  const running = step >= 0 && step < 3;
  return (
    <div className={`intelligence-atlas ${running ? 'is-running' : ''} ${step === 3 ? 'is-complete' : ''}`} data-stage={step} aria-hidden="true">
      <div className="intelligence-atlas__meta"><span>JC / NEURAL ATLAS</span><span>{['01 · PREDICCIÓN', '02 · CONOCIMIENTO', '03 · AUTOMATIZACIÓN'][selected]}</span></div>
      <svg viewBox="0 0 640 282" fill="none">
        <defs>
          <radialGradient id={`${id}-aura`}><stop stopColor="#95d9ac" stopOpacity=".2" /><stop offset="1" stopColor="#95d9ac" stopOpacity="0" /></radialGradient>
          <radialGradient id={`${id}-lens`} cx="32%" cy="25%" r="80%"><stop stopColor="#d6f4d6" stopOpacity=".7" /><stop offset=".25" stopColor="#6f9e7d" stopOpacity=".45" /><stop offset=".6" stopColor="#112f22" stopOpacity=".75" /><stop offset="1" stopColor="#96bda2" stopOpacity=".48" /></radialGradient>
          <linearGradient id={`${id}-bezel`} x1="250" y1="60" x2="390" y2="225" gradientUnits="userSpaceOnUse"><stop stopColor="#effadf" /><stop offset=".24" stopColor="#6c8c77" /><stop offset=".5" stopColor="#dbf4d9" /><stop offset=".75" stopColor="#355440" /><stop offset="1" stopColor="#adc7a3" /></linearGradient>
          <radialGradient id={`${id}-copper`} cx="32%" cy="25%"><stop stopColor="#ffedd2" /><stop offset=".3" stopColor="#eab88b" /><stop offset=".75" stopColor="#aa714b" /><stop offset="1" stopColor="#e3a272" /></radialGradient>
          <linearGradient id={`${id}-glass`} x1="260" y1="70" x2="380" y2="205" gradientUnits="userSpaceOnUse"><stop stopColor="#d4ffe5" stopOpacity=".26" /><stop offset=".45" stopColor="#497361" stopOpacity=".05" /><stop offset="1" stopColor="#a2e5bd" stopOpacity=".17" /></linearGradient>
          <linearGradient id={`${id}-trace`} x1="110" y1="150" x2="555" y2="150" gradientUnits="userSpaceOnUse"><stop stopColor="#50866b" /><stop offset=".48" stopColor="#c7f6d9" /><stop offset="1" stopColor="#eea275" /></linearGradient>
          <linearGradient id={`${id}-area`} x1="0" y1="115" x2="0" y2="210" gradientUnits="userSpaceOnUse"><stop stopColor="#c3f5db" stopOpacity=".3" /><stop offset="1" stopColor="#c3f5db" stopOpacity="0" /></linearGradient>
          <pattern id={`${id}-grid`} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" stroke="#afddc6" strokeOpacity=".07" strokeWidth=".7" /></pattern>
        </defs>
        <rect width="640" height="282" fill={`url(#${id}-grid)`} />
        <circle cx="320" cy="141" r="136" fill={`url(#${id}-aura)`} />
        <circle cx="320" cy="141" r="114" stroke="#8ab29a" strokeOpacity=".12" />
        <circle cx="320" cy="141" r="98" stroke="#8ab29a" strokeOpacity=".18" strokeDasharray="2 7" />
        {Array.from({length:48},(_,i)=>{const angle=i*Math.PI/24;const inner=i%4===0?102:107;return <line key={i} x1={320+Math.cos(angle)*inner} y1={141+Math.sin(angle)*inner} x2={320+Math.cos(angle)*112} y2={141+Math.sin(angle)*112} stroke={i%4===0?'#b5d1b4':'#54735d'} strokeWidth={i%4===0?1:.5} opacity=".5" />;})}
        {[[-82,-62],[79,-62],[82,62],[-79,62]].map(([x,y],i)=><g key={i}><circle cx={320+x} cy={141+y} r="5" fill="#12281b" stroke="#63806b" strokeWidth=".8" /><motion.circle cx={320+x} cy={141+y} r="2" fill={i===step?'#edb588':'#91b99a'} initial={false} animate={{opacity:step>=i?.95:.35}} transition={{duration:reduce?0:.3}} /></g>)}
        {[104, 141, 178].map((y, index) => <g key={y}>
          <path d={`M143 ${y}H179C207 ${y} 205 141 247 141M393 141C439 141 432 ${y} 464 ${y}H497`} stroke="#345b47" strokeWidth="1" />
          <motion.path key={`${selected}-${step}-${index}`} d={`M143 ${y}H179C207 ${y} 205 141 247 141M393 141C439 141 432 ${y} 464 ${y}H497`} stroke={`url(#${id}-trace)`} strokeWidth="1.5" initial={{ pathLength: reduce || step < 0 ? 1 : 0 }} animate={{ pathLength: 1, opacity: step >= 0 ? .9 : .32 }} transition={{ duration: reduce ? 0 : .6, delay: reduce ? 0 : index * .05 }} />
        </g>)}
        <g transform="translate(25 69)">
          <rect width="118" height="144" rx="6" fill="#11231b" stroke={step >= 0 ? '#8fbfa4' : '#385643'} />
          <text x="13" y="21" fill="#b1cfbd" fontFamily="monospace" fontSize="8">{['DATA SOURCE', 'DOCUMENTOS', 'SOLICITUD'][selected]}</text>
          <path d="M0 31H118" stroke="#345641" />
          {INPUT_POINTS.map((y, i) => <g key={y}>
            <rect x="13" y={y + 4} width="5" height="5" rx="1" fill={i === selected ? '#edac85' : '#6f9d7d'} />
            <path d={`M26 ${y + 6}H${[94, 78, 87, 65][i]}`} stroke="#7fac8f" strokeWidth="2" strokeLinecap="round" opacity=".55" />
            {selected === 0 && <path d={`M${[94, 78, 87, 65][i]} ${y + 6}H103`} stroke="#d1ecd6" strokeWidth="2" opacity=".4" />}
          </g>)}
          <circle cx="105" cy="18" r="2" fill="#c3f5db" />
        </g>
        <motion.g className="intelligence-atlas__core" initial={false} animate={{ rotate: running && !reduce ? 60 * (step + 1) : step === 3 && !reduce ? 180 : 0 }} transition={{ duration: reduce ? 0 : .55 }} style={{ transformOrigin: '320px 141px' }}>
          <circle cx="320" cy="144" r="79" fill="#020c06" opacity=".7" />
          <circle cx="320" cy="141" r="78" fill="#173424" stroke={`url(#${id}-bezel)`} strokeWidth="3" />
          <circle cx="320" cy="141" r="71" fill={`url(#${id}-lens)`} stroke="#c1e5cb" strokeOpacity=".8" />
          {[0, 60, 120].map((angle) => <ellipse key={angle} cx="320" cy="141" rx="29" ry="70" transform={`rotate(${angle} 320 141)`} stroke="#b7e2c7" strokeOpacity=".63" fill={`url(#${id}-glass)`} />)}
          <path d="M277 122C283 99 307 80 333 78" stroke="#e3f9dd" strokeWidth="2" strokeLinecap="round" opacity=".7" />
          <path d="M364 162C356 184 334 201 310 204" stroke="#84b393" strokeWidth="1.5" strokeLinecap="round" opacity=".7" />
          <circle cx="320" cy="141" r="24" fill="#193024" stroke={`url(#${id}-bezel)`} strokeWidth="1.5" />
          <circle cx="320" cy="141" r="17" fill={`url(#${id}-copper)`} stroke="#e2bf94" strokeWidth=".8" />
          <path d="M320 133V149M312 141H328M315 136L325 146M315 146L325 136" stroke="#473623" strokeWidth="1.2" />
        </motion.g>
        <g transform="translate(497 69)">
          <rect width="118" height="144" rx="6" fill="#11231b" stroke={step === 3 ? '#d6ae88' : '#385643'} />
          <text x="12" y="21" fill="#b1cfbd" fontFamily="monospace" fontSize="8">{['PROYECCIÓN', 'REFERENCIA', 'DESTINO'][selected]}</text>
          <path d="M0 31H118" stroke="#345641" />
          {selected === 0 ? <>
            {[62, 86, 110].map(y => <path key={y} d={`M12 ${y}H106`} stroke="#345641" strokeDasharray="2 3" />)}
            <path d="M13 113L29 99L45 105L61 77L77 83L93 53L105 63V126H13Z" fill={`url(#${id}-area)`} />
            <path d="M13 113L29 99L45 105L61 77L77 83L93 53L105 63" stroke="#b9edcc" strokeWidth="2" />
            <circle cx="93" cy="53" r="3" fill="#eeac7e" />
            <text x="13" y="137" fill="#749e83" fontSize="7" fontFamily="monospace">JUL · AGO · SEP</text>
          </> : selected === 1 ? <>
            <path d="M23 47H76L91 62V115H23Z" fill="#a4d6b8" fillOpacity=".08" stroke="#76a48b" />
            <path d="M76 47V62H91M35 75H78M35 83H68M35 91H73" stroke="#a6ceb8" />
            <rect x="31" y="97" width="54" height="10" rx="2" fill="#edb088" fillOpacity=".28" />
            <text x="13" y="137" fill="#749e83" fontSize="7" fontFamily="monospace">FUENTE / SECCIÓN 2</text>
          </> : <>
            <path d="M22 61H39V94H54M39 61H54M39 94V119H54" stroke="#91bda1" />
            {[52, 85, 110].map((y, i) => <g key={y}><rect x="54" y={y} width="49" height="18" rx="3" fill={i === 1 ? '#b9edcc' : '#1e3c2c'} stroke="#5e886c" /><path d={`M61 ${y + 9}H94`} stroke={i === 1 ? '#274c35' : '#719c7d'} /></g>)}
            <circle cx="22" cy="61" r="4" fill="#edb088" />
          </>}
        </g>
        <text x="320" y="244" textAnchor="middle" fill="#accfb8" fontFamily="monospace" fontSize="8" letterSpacing="2">{step === 3 ? 'RECORRIDO COMPLETO' : running ? 'PROCESANDO EJEMPLO' : 'LISTO PARA EXPLORAR'}</text>
        <path d="M20 20H30M25 15V25M610 262H620M615 257V267" stroke="#718e7c" />
      </svg>
      <div className="intelligence-atlas__legend"><span><i />Datos de entrada</span><span><i />Modelo + contexto</span><span><i />Salida útil</span></div>
    </div>
  );
};

export const CampaignTile = ({ variant = 0 }) => (
  <div className={`campaign-tile campaign-tile--${variant}`} aria-hidden="true">
    {variant === 1 || variant === 4 ? <svg viewBox="0 0 120 130" fill="none"><circle cx="60" cy="66" r="47" stroke="currentColor" strokeWidth=".5" strokeDasharray="1 4" />{[0,30,60,90,120,150].map(angle=><ellipse key={angle} cx="60" cy="66" rx={variant===4?10:18} ry="39" transform={`rotate(${angle} 60 66)`} stroke="currentColor" strokeWidth=".7" />)}<circle cx="60" cy="66" r="8" stroke="currentColor" /><circle cx="60" cy="66" r="4" fill="currentColor" /><path d="M10 14H20M15 9V19M100 118H110M105 113V123" stroke="currentColor" strokeWidth=".6" /></svg> : <img src={`${import.meta.env.BASE_URL}artwork/${variant === 3 || variant === 5 ? 'project-gateway' : variant === 2 ? 'connected-materials-v2' : 'creative-orbit-v2'}.webp`} alt="" loading="lazy" decoding="async" width={variant === 0 || variant === 6 ? 900 : 1200} height={variant === 0 || variant === 6 ? 1350 : 800} />}
    <span>0{variant + 1}</span>
  </div>
);
