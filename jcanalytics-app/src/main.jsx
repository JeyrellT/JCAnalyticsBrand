import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { resolveRoute } from './seo/routes.js'
import AssistantChat from './components/ui/AssistantChat.jsx'
import LeadDialog from './components/ui/LeadDialog.jsx'
import WhatsAppReturn from './components/ui/WhatsAppReturn.jsx'

const route = resolveRoute(window.location.pathname)

async function mountPage() {
  // Keep the complete static document visible while the editorial module loads.
  const Page = route?.type === 'home' ? App : (await import('./JournalApp.jsx')).default
  // LeadDialog: en computadora, los enlaces de WhatsApp abren el formulario corto (ver ui/LeadDialog.jsx).
  // WhatsAppReturn: en celular, quien vuelve de WhatsApp sin haber dejado consulta puede dejar su número.
  createRoot(document.getElementById('root')).render(
    <StrictMode><Page route={route} /><AssistantChat /><LeadDialog /><WhatsAppReturn /></StrictMode>,
  )
}

mountPage()
  .then(() => {
    // Medición propia hacia el portal: cuando el navegador está libre, fuera del camino crítico.
    const start = () => import('./seo/site-tracker.js').then(m => m.startSiteTracking()).catch(() => {})
    if ('requestIdleCallback' in window) window.requestIdleCallback(start, { timeout: 3000 })
    else window.setTimeout(start, 1500)
    // También con el primer toque o tecla: quien toca un botón en el primer segundo ya queda medido
    // (startSiteTracking ignora la segunda llamada).
    for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, start, { once: true, capture: true, passive: true })
  })
  .catch(error => console.error('Interactive page could not load; static content remains available.', error))
