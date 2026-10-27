import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'
import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('index.html must contain a #root element')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
)
