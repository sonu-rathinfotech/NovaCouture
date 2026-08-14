import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { SessionProvider } from './context/SessionProvider.tsx'
import './index.css'
// Design variant (this branch: dark luxury). Scoped under `.ui-dark` so the
// admin panel — which renders outside that scope — keeps the original design.
import './variants/dark-luxury.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
