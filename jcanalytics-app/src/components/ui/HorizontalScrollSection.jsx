import React, { useRef, useEffect, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ShieldCheck, Target, Database, CheckCircle, ArrowRight } from 'lucide-react';
import TiltCard from './TiltCard';
import CaseStudyModal from './CaseStudyModal';
import { casesData } from '../../data/caseStudies';

gsap.registerPlugin(ScrollTrigger);

const HorizontalScrollSection = () => {
  const sectionRef = useRef(null);
  const scrollRef = useRef(null);
  const [activeModalId, setActiveModalId] = useState(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    const updateDesktopMode = () => setIsDesktop(desktopQuery.matches);

    updateDesktopMode();
    desktopQuery.addEventListener('change', updateDesktopMode);

    return () => desktopQuery.removeEventListener('change', updateDesktopMode);
  }, []);

  useEffect(() => {
    if (!isDesktop) return;

    let ctx = gsap.context(() => {
      const scrollContainer = scrollRef.current;
      if (!scrollContainer) return;

      const cards = gsap.utils.toArray('.horizontal-panel');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          pin: true,
          scrub: 1,
          end: () => "+=" + (scrollContainer.scrollWidth - window.innerWidth),
        }
      });

      tl.to(scrollContainer, {
        x: () => -(scrollContainer.scrollWidth - window.innerWidth) + "px",
        ease: "none",
      });

      // Animate Image Clip Paths as they come into view based on the same timeline
      cards.forEach((card, i) => {
        const img = card.querySelector('.distortion-img');
        if (img) {
          tl.to(img, {
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)',
            duration: 0.5,
            ease: "power2.out",
          }, i * 0.4);
        }
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [isDesktop]);

  const cardData = [
    {
      id: "inteligencia",
      title: "Inteligencia de Datos",
      desc: "Dashboard ejecutivo de ventas e inventario, modelo de cartera de clientes y aging, forecast de demanda para predecir inventario y picos.",
      icon: <Target className="text-blue-400" size={28} />,
      colorClass: "group-hover:text-blue-600",
      iconBox: "border-blue-400/30",
      checkColor: "text-blue-500",
      btnClass: "bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white border-blue-100",
      img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
      points: ["Assessment: $500", "Implementación desde $1,500"],
      accent: "from-blue-500/20 to-blue-600/5",
    },
    {
      id: "automatizacion",
      title: "Automatización de Procesos",
      desc: "Cierre de reportes automático, alertas de SLA por Teams/WhatsApp, y pipelines de limpieza de datos desde tu ERP o contabilidad.",
      icon: <Database className="text-orange-400" size={28} />,
      colorClass: "group-hover:text-orange-600",
      iconBox: "border-orange-400/30",
      checkColor: "text-orange-500",
      btnClass: "bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white border-orange-100",
      img: "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?auto=format&fit=crop&q=80&w=800",
      points: ["Proceso de 3h reducido a 30s", "Alertas automáticas"],
      accent: "from-orange-500/20 to-orange-600/5",
    },
    {
      id: "transferencia",
      title: "Transferencia de Conocimiento",
      desc: "Capacitación en Power BI y Python para tu equipo. SOPs y documentación del modelo de datos. Tu equipo será completamente autónomo.",
      icon: <ShieldCheck className="text-emerald-400" size={28} />,
      colorClass: "group-hover:text-emerald-600",
      iconBox: "border-emerald-400/30",
      checkColor: "text-emerald-500",
      btnClass: "bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white border-emerald-100",
      img: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&q=80&w=800",
      points: ["Capacitación de tu equipo en CR", "Mantenimiento autónomo"],
      accent: "from-emerald-500/20 to-emerald-600/5",
    }
  ];

  return (
    <>
      <div
        id="servicios"
        ref={sectionRef}
        className={`w-full bg-slate-50 relative border-t border-slate-200 ${isDesktop ? 'h-screen flex items-center overflow-hidden' : 'py-12 sm:py-16 overflow-visible'}`}
      >
        {/* Mobile section header (only shown on mobile, outside the scroll container) */}
        {!isDesktop && (
          <div className="px-4 sm:px-6 mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-bold mb-3 border border-blue-100">
              <Target size={12} /> Servicios
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 mb-2 tracking-normal">Soluciones con Precios Transparentes</h2>
            <p className="font-sans text-sm sm:text-base text-slate-500">Del catálogo genérico a un menú con precios orientativos para PYMEs.</p>
          </div>
        )}

        <div
          ref={scrollRef}
          className={isDesktop
            ? 'flex h-3/4 items-center w-max pl-6 md:pl-[min(10vw,8rem)] pr-[10vw] gap-10 md:gap-20 mt-16 md:mt-0'
            : 'flex flex-nowrap overflow-x-auto snap-x snap-mandatory gap-4 sm:gap-5 w-full px-4 sm:px-6 pb-6 sm:pb-8 no-scrollbar'}
        >

          {/* Desktop-only title card */}
          {isDesktop && (
            <div className="w-[85vw] md:w-[35vw] max-w-md shrink-0 mb-20 md:mb-0">
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-slate-900 tracking-normal">Soluciones con Precios Transparentes</h2>
              <p className="font-sans text-base sm:text-lg text-slate-600">Del catálogo genérico a un menú con precios orientativos para PYMEs. Entregables claros, costos fijos.</p>
            </div>
          )}

          {cardData.map((card, idx) => (
            <div
              key={idx}
              className={`horizontal-panel flex items-center justify-center ${isDesktop ? 'w-[85vw] md:w-[35vw] h-full max-h-[600px] shrink-0' : 'w-[82vw] sm:w-[72vw] md:w-[44vw] snap-center shrink-0 h-auto'}`}
            >
              <TiltCard className="w-full h-full max-w-md">
                <div className="bg-white rounded-[1.75rem] sm:rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/50 transition-all duration-300 group flex flex-col h-full overflow-hidden relative">
                  {/* Card image */}
                  <div className="h-44 sm:h-52 md:h-52 lg:h-56 overflow-hidden relative shrink-0">
                    <img
                      src={card.img}
                      alt={card.title}
                      className="distortion-img w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      style={isDesktop ? { clipPath: 'polygon(0 100%, 100% 100%, 100% 100%, 0 100%)' } : { clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
                    />
                    <div className="absolute top-0 inset-x-0 h-full bg-gradient-to-t from-slate-900/90 via-transparent to-transparent pointer-events-none z-10"></div>
                  </div>

                  {/* Floating icon badge */}
                  <div className={`absolute top-36 sm:top-44 md:top-44 lg:top-48 left-5 z-20 glass-card p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border ${card.iconBox}`}>
                    {card.icon}
                  </div>

                  <div className="p-4 sm:p-6 md:p-8 pt-9 sm:pt-11 md:pt-10 flex-1 flex flex-col bg-white z-20 relative min-h-0">
                    <div className="flex-1 min-h-0">
                      <h3 className={`font-display text-lg sm:text-xl md:text-2xl font-bold mb-2 sm:mb-3 text-slate-900 transition-colors ${card.colorClass}`}>{card.title}</h3>
                      <p className="font-sans text-slate-600 mb-4 sm:mb-5 text-xs sm:text-sm leading-relaxed">
                        {card.desc}
                      </p>
                      <ul className="space-y-2 sm:space-y-3">
                        {card.points.map((point, i) => (
                          <li key={i} className="flex items-center gap-2 sm:gap-3 text-slate-700 font-bold bg-slate-50 p-2.5 sm:p-3 rounded-xl border border-slate-100">
                            <CheckCircle size={16} className={`${card.checkColor} shrink-0`} />
                            <span className="text-xs sm:text-sm">{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => setActiveModalId(card.id)}
                      className={`mt-4 sm:mt-5 md:mt-6 flex w-full items-center justify-center gap-2 text-center py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-bold transition-all border text-xs sm:text-sm active:scale-95 ${card.btnClass}`}
                    >
                      Ver todos los casos reales <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </TiltCard>
            </div>
          ))}
        </div>

        {/* Mobile scroll indicator dots */}
        {!isDesktop && (
          <div className="flex justify-center gap-2 mt-4 sm:mt-6">
            {cardData.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === 0 ? 'bg-blue-500 w-4' : 'bg-slate-300'}`} />
            ))}
          </div>
        )}
      </div>

      <CaseStudyModal
        isOpen={!!activeModalId}
        onClose={() => setActiveModalId(null)}
        categoryId={activeModalId}
        casesData={casesData}
      />
    </>
  );
};

export default HorizontalScrollSection;
