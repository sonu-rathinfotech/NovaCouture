import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { SessionProvider } from './context/SessionProvider.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'
// Tailwind entry (tokens, base layer) first, then the freeui design system.
import './index.css'
import './variants/freeui.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outside SessionProvider on purpose: if fetching the session throws, the
        boundary still has to be able to render. */}
    <ErrorBoundary>
      <BrowserRouter>
        <SessionProvider>
          <App />
        </SessionProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
