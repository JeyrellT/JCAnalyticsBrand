import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { resolveRoute } from './seo/routes.js'
import AssistantChat from './components/ui/AssistantChat.jsx'

const route = resolveRoute(window.location.pathname)

async function mountPage() {
  // Keep the complete static document visible while the editorial module loads.
  const Page = route?.type === 'home' ? App : (await import('./JournalApp.jsx')).default
  createRoot(document.getElementById('root')).render(
    <StrictMode><Page route={route} /><AssistantChat /></StrictMode>,
  )
}

mountPage().catch(error => console.error('Interactive page could not load; static content remains available.', error))
