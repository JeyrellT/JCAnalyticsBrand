import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, LoaderCircle, MessageCircle, Send, Sparkles, X } from 'lucide-react';
import { locale, t } from '../../i18n/locale';
import { wa } from '../site/links';
import '../../styles/assistant.css';

const ENDPOINT = import.meta.env.VITE_ASSISTANT_API_URL || (import.meta.env.DEV ? '/api/chat' : 'https://assistant-api-production-0d9b.up.railway.app/api/chat');
const FALLBACK = t(
  'Para darte una respuesta precisa, el equipo puede ayudarte por WhatsApp al 7033-0596. Continuá con tu consulta usando el botón de abajo.',
  'For an accurate answer, our team can help on WhatsApp at +506 7033-0596. Continue with your question using the button below.',
);
const STARTERS = t(['¿Qué servicios ofrecen?', '¿Cuánto cuesta una página web?', 'Quiero hablar con el equipo'], ['What services do you offer?', 'How much does a website cost?', 'I want to speak with a human']);

export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [messages, setMessages] = useState([{
    role: 'assistant',
    content: t('¡Hola! Soy la asistente virtual de JC Analytics. Te ayudo con nuestros servicios y los primeros pasos de tu proyecto. ¿Qué querés resolver?', 'Hi! I’m the JC Analytics virtual assistant. I can help with our services and the first steps of your project. What would you like to solve?'),
  }]);
  const dialogRef = useRef(null);
  const launcherRef = useRef(null);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const requestRef = useRef(null);

  useEffect(() => () => requestRef.current?.abort(), []);

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    window.dispatchEvent(new CustomEvent('jca:assistant-state', { detail: { open: true } }));
    const viewport = window.visualViewport;
    const resize = () => {
      dialogRef.current?.style.setProperty('--assistant-viewport-height', `${viewport?.height || window.innerHeight}px`);
      dialogRef.current?.style.setProperty('--assistant-keyboard-inset', `${Math.max(0, window.innerHeight - (viewport ? viewport.height + viewport.offsetTop : window.innerHeight))}px`);
    };
    resize();
    viewport?.addEventListener('resize', resize);
    viewport?.addEventListener('scroll', resize);
    return () => {
      document.documentElement.style.overflow = previousOverflow;
      viewport?.removeEventListener('resize', resize);
      viewport?.removeEventListener('scroll', resize);
      window.dispatchEvent(new CustomEvent('jca:assistant-state', { detail: { open: false } }));
    };
  }, [open]);

  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [messages, pending, open]);

  function showChat() {
    dialogRef.current.showModal();
    setOpen(true);
  }

  function closeChat() {
    dialogRef.current.close();
  }

  async function sendMessage(content = draft) {
    const question = content.trim();
    if (!question || question.length > 1200 || requestRef.current) return;
    const next = [...messages, { role: 'user', content: question }];
    setMessages(next);
    setDraft('');
    setPending(true);
    const controller = new AbortController();
    requestRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetch(ENDPOINT, {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: locale, messages: next.slice(1).slice(-11).map(({ role, content }) => ({ role, content })) }),
      });
      if (!response.ok) throw new Error('Assistant unavailable');
      const answer = await response.json();
      if (typeof answer.reply !== 'string' || !answer.reply.trim() || answer.reply.length > 1200 || typeof answer.handoff !== 'boolean') throw new Error('Invalid assistant reply');
      setMessages(current => [...current, { role: 'assistant', content: answer.reply, handoff: answer.handoff }]);
    } catch {
      setMessages(current => [...current, { role: 'assistant', content: FALLBACK, handoff: true }]);
    } finally {
      window.clearTimeout(timer);
      requestRef.current = null;
      setPending(false);
    }
  }

  const context = messages.filter(message => message.role === 'user').slice(-3).map(message => message.content.slice(0, 500)).join('\n\n');
  const whatsapp = wa(t('Hola, vengo de la asistente de JC Analytics. Quisiera ayuda con esta consulta:', 'Hi, I’m coming from the JC Analytics assistant. I’d like help with this question:') + (context ? `\n\n${context}` : ''));

  return <>
    <button ref={launcherRef} className="assistant-launcher" type="button" onClick={showChat} aria-haspopup="dialog" aria-expanded={open} aria-controls="jca-assistant" aria-label={t('Abrir asistente virtual', 'Open virtual assistant')}>
      <Sparkles size={22} aria-hidden="true" /><span>{t('¿Te ayudo?', 'Need a hand?')}</span>
    </button>
    <dialog ref={dialogRef} id="jca-assistant" className="assistant-dialog" aria-labelledby="assistant-title" onClose={() => { setOpen(false); launcherRef.current?.focus({ preventScroll: true }); }} onClick={event => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeChat(); } }} data-lenis-prevent>
      <div className="assistant-panel">
        <header className="assistant-header"><span className="assistant-avatar"><Sparkles size={22} aria-hidden="true" /></span><div><h2 id="assistant-title">{t('Asistente de JC Analytics', 'JC Analytics assistant')}</h2><p>{t('Una buena pregunta es el primer paso.', 'A good question is the first step.')}</p></div><button type="button" onClick={closeChat} aria-label={t('Cerrar asistente', 'Close assistant')}><X size={21} aria-hidden="true" /></button></header>
        <div ref={logRef} className="assistant-log" role="log" aria-live="polite" aria-relevant="additions" aria-label={t('Conversación con la asistente', 'Conversation with the assistant')}>
          {messages.map((message, index) => <div key={index} className={`assistant-message assistant-message--${message.role}`}><span className="assistant-message__author">{message.role === 'user' ? t('Vos', 'You') : t('Asistente', 'Assistant')}</span><p>{message.content}</p>{message.handoff && <a className="assistant-handoff" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={18} aria-hidden="true" />{t('Continuar por WhatsApp', 'Continue on WhatsApp')}<ArrowUpRight size={16} aria-hidden="true" /></a>}</div>)}
          {pending && <div className="assistant-pending" role="status"><LoaderCircle size={16} aria-hidden="true" />{t('Preparando tu respuesta…', 'Preparing your answer…')}</div>}
        </div>
        {messages.length === 1 && <div className="assistant-starters" aria-label={t('Preguntas para empezar', 'Questions to get started')}>{STARTERS.map(question => <button type="button" key={question} onClick={() => sendMessage(question)}>{question}<ArrowUpRight size={14} aria-hidden="true" /></button>)}</div>}
        <div className="assistant-compose">
          <form onSubmit={event => { event.preventDefault(); sendMessage(); }} aria-busy={pending}>
            <label htmlFor="assistant-question" className="sr-only">{t('Tu consulta', 'Your question')}</label>
            <textarea ref={inputRef} id="assistant-question" value={draft} onChange={event => setDraft(event.target.value)} maxLength={1200} rows={2} placeholder={t('Contame qué necesitás…', 'Tell me what you need…')} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); sendMessage(); } }} />
            <button type="submit" disabled={pending || !draft.trim()} aria-label={t('Enviar consulta', 'Send question')}><Send size={18} aria-hidden="true" /></button>
          </form>
          <div className="assistant-footer"><span>{t('Asistente con IA · Mensajes procesados por DeepSeek.', 'AI assistant · Messages processed by DeepSeek.')}</span><a href={whatsapp} target="_blank" rel="noopener noreferrer">{t('Hablar con el equipo', 'Talk to our team')}</a></div>
        </div>
      </div>
    </dialog>
  </>;
}
