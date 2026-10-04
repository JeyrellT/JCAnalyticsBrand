import { Children, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';

// Native scrolling keeps touch momentum, zoom and vertical navigation intact.
export default function MobileRail({ children, className, label }) {
  const track = useRef(null);
  const id = useId();
  const [index, setIndex] = useState(0);
  const count = Children.count(children);
  const reduce = useReducedMotion();
  useEffect(() => {
    const element = track.current;
    const mobile = window.matchMedia('(max-width: 767px)');
    let frame = 0;
    const measure = () => {
      frame = 0;
      element.tabIndex = mobile.matches ? 0 : -1;
      const left = element.getBoundingClientRect().left;
      const distances = Array.from(element.children).map(child => Math.abs(child.getBoundingClientRect().left - left));
      setIndex(Math.max(0, distances.indexOf(Math.min(...distances))));
    };
    const schedule = () => { if (!frame) frame = window.requestAnimationFrame(measure); };
    const observer = new ResizeObserver(schedule);
    observer.observe(element);
    element.addEventListener('scroll', schedule, { passive: true });
    mobile.addEventListener('change', schedule);
    schedule();
    return () => { observer.disconnect(); window.cancelAnimationFrame(frame); element.removeEventListener('scroll', schedule); mobile.removeEventListener('change', schedule); };
  }, [count]);
  const go = (next) => {
    const element = track.current;
    const child = element.children[Math.max(0, Math.min(count - 1, next))];
    if (child) element.scrollTo({ left: element.scrollLeft + child.getBoundingClientRect().left - element.getBoundingClientRect().left, behavior: reduce ? 'instant' : 'smooth' });
  };
  return <div className="mobile-rail">
    <div ref={track} id={id} className={`${className} mobile-rail__track`} role="group" aria-label={label} onKeyDown={event => {
      if (event.target !== event.currentTarget || !window.matchMedia('(max-width: 767px)').matches) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); go(index + (event.key === 'ArrowRight' ? 1 : -1)); }
    }}>{children}</div>
    <div className="mobile-rail__controls"><span>Deslizá para descubrir <span aria-live="polite">{String(index + 1).padStart(2, '0')} / {String(count).padStart(2, '0')}</span></span><div><button type="button" aria-label={`Anterior: ${label}`} aria-controls={id} disabled={index === 0} onClick={() => go(index - 1)}><ArrowLeft size={18} /></button><button type="button" aria-label={`Siguiente: ${label}`} aria-controls={id} disabled={index === count - 1} onClick={() => go(index + 1)}><ArrowRight size={18} /></button></div></div>
  </div>;
}
