import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Root } from './App.jsx';
import { registerServiceWorker } from './lib/pwa.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

// App instalable y avisos push (solo en producción; la demo usa su propia entrada).
registerServiceWorker();
