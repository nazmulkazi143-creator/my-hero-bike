import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { AppProvider } from './ctx'
import { StoreProvider } from './store'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProvider>
      <StoreProvider>
        <App />
      </StoreProvider>
    </AppProvider>
  </StrictMode>,
)

if (!__SINGLE__ && import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is best-effort */
    })
  })
}
