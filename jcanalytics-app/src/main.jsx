import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { resolveRoute } from './seo/routes.js'

const JournalApp = lazy(() => import('./JournalApp.jsx'))
const route = resolveRoute(window.location.pathname)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<p role="status">JC Analytics…</p>}>
      {route?.type === 'home' ? <App /> : <JournalApp route={route} />}
    </Suspense>
  </StrictMode>,
)
