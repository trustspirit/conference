import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from 'trust-ui-react'
import App from './App'
import 'trust-ui-react/styles.css'
import './styles/global.css'
import './i18n'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
