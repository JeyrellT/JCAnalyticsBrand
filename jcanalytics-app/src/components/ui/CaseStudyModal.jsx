import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, ArrowRight, Layers, Target, Database, ShieldCheck } from 'lucide-react';

const _MOTION = motion;

const CaseStudyModal = ({ isOpen, onClose, categoryId, casesData }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen || !categoryId || !casesData[categoryId]) return null;

  const category = casesData[categoryId];
  const Icon = category.icon;

  return ReactDOM.createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[9998] flex items-start sm:items-center justify-center p-3 sm:p-6 overflow-y-auto" data-lenis-prevent>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm"
        />
        
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", bounce: 0, duration: 0.4 }}
          className="relative w-full max-w-full sm:max-w-3xl lg:max-w-5xl bg-white rounded-[1.5rem] sm:rounded-[2rem] shadow-2xl overflow-hidden my-3 sm:my-8"
        >
          {/* Header */}
          <div className={`p-5 sm:p-8 md:p-12 ${category.bgClass} relative overflow-hidden`}>
            {/* Decorative background blur */}
            <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-[80px] opacity-50 ${category.glowClass}`}></div>
            
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md z-10 min-h-11 min-w-11 flex items-center justify-center"
            >
              <X size={24} />
            </button>
            
            <div className="relative z-10 flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/10 rounded-xl backdrop-blur-md text-white border border-white/20">
                 <Icon size={28} />
              </div>
              <div className="text-sm font-bold tracking-widest text-white/80 uppercase">Casos Reales</div>
            </div>
            
            <h2 className="relative z-10 text-2xl sm:text-3xl md:text-5xl font-display font-black text-white">{category.title}</h2>
          </div>

          {/* Content Body - Scrollable */}
          <div className="p-4 sm:p-6 md:p-12 max-h-[78vh] sm:max-h-[70vh] overflow-y-auto custom-scrollbar bg-slate-50" data-lenis-prevent>
            <div className="space-y-8 sm:space-y-16">
              {category.cases.map((cs, idx) => (
                <div key={idx} className="bg-white rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                  {/* Subtle category accent line on left */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${category.accentClass} z-20`}></div>
                  
                  {/* Case Header — placeholder tipográfico (o imagen si está disponible) */}
                  {cs.image ? (
                    <div className="w-full h-48 md:h-64 relative overflow-hidden">
                      <img 
                        src={cs.image} 
                        alt={cs.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      />
                      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 to-transparent"></div>
                    </div>
                  ) : (
                    <div className="w-full px-6 py-5 border-b border-dashed border-slate-300 bg-slate-50/60">
                      <div className="font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                        {(cs.tech && cs.tech[0]) ? cs.tech[0] : 'Stack'} · {cs.sector}
                      </div>
                    </div>
                  )}
                  
                  <div className="p-5 sm:p-8 md:p-10 relative z-10">
                    <div className="mb-8">
                      <div className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400 mb-2">{cs.sector}</div>
                      <h3 className="font-display text-2xl md:text-3xl font-bold text-slate-900">{cs.title}</h3>
                    </div>

                    {/* Layout mono-columna en mobile/tablet · 2 columnas con resultado sticky en xl+ */}
                    <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_320px] xl:gap-12">
                      {/* Narrativa: Problema → Metodología → Solución → Tech */}
                      <div className="space-y-8">
                        <div>
                          <h4 className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-[var(--brand-bad)] mb-3">
                            <Layers size={14} /> El problema real
                          </h4>
                          <p className="font-sans text-slate-600 leading-relaxed">
                            {cs.problem}
                          </p>
                        </div>

                        {cs.methodology && (
                          <div>
                            <h4 className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-slate-700 mb-4">
                              Metodología · 4D
                            </h4>
                            <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:w-px before:bg-slate-200">
                              {Object.entries(cs.methodology).map(([phase, desc], i) => (
                                <div key={i} className="relative pl-8">
                                  <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white ${category.accentClass} shadow-sm z-10`} />
                                  <strong className="font-mono text-xs text-slate-800 uppercase tracking-[0.14em] block mb-1">{phase}</strong>
                                  <span className="text-sm text-slate-600 block leading-relaxed">{desc}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h4 className="flex items-center gap-2 text-[11px] font-mono font-bold uppercase tracking-[0.18em] text-slate-700 mb-3">
                            <Target size={14} /> Solución construida
                          </h4>
                          <p className="font-sans text-slate-600 leading-relaxed whitespace-pre-line">
                            {cs.solution}
                          </p>
                        </div>

                        <div>
                          <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 mb-3">Tecnología</h4>
                          <div className="flex flex-wrap gap-2">
                            {cs.tech.map((tech, i) => (
                              <span key={i} className="font-mono text-[11px] font-medium px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Resultado — sticky en xl+, inline al final en mobile/tablet */}
                      <aside className="mt-8 xl:mt-0">
                        <div className="xl:sticky xl:top-6">
                          <div className="p-5 sm:p-6 rounded-2xl border bg-[color-mix(in_oklab,var(--brand-ok)_8%,white)] border-[color-mix(in_oklab,var(--brand-ok)_25%,transparent)]">
                            <h4 className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] mb-3 text-[var(--brand-ok)]">
                              Resultado medible
                            </h4>
                            <p className="font-sans font-medium text-slate-800 text-base leading-relaxed flex items-start gap-3">
                              <CheckCircle className="shrink-0 mt-0.5 text-[var(--brand-ok)]" size={18} />
                              <span>{cs.result}</span>
                            </p>
                          </div>
                        </div>
                      </aside>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-10 sm:mt-12 text-center">
              <a 
                href="https://wa.me/50670330596?text=Hola,%20vi%20los%20casos%20de%20uso%20y%20quiero%20conversar%20sobre%20c%C3%B3mo%20aplicarlo%20a%20mi%20empresa." 
                target="_blank" 
                rel="noreferrer"
                className={`inline-flex w-full sm:w-auto items-center justify-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 rounded-full font-bold text-white transition-all hover:scale-105 shadow-lg min-h-11 ${category.bgClass} hover:opacity-90`}
              >
                Quiero algo similar para mi empresa <ArrowRight size={20} />
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};

export default CaseStudyModal;
