import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { SessionProvider } from './context/SessionProvider.tsx'
import './index.css'
// Design variant (this branch: warm heritage). Scoped under `.ui-heritage`
// so the admin panel — outside that scope — keeps the original design.
import './variants/warm-heritage.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
)
