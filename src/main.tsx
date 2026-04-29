import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { FluentProvider, webDarkTheme, type Theme } from '@fluentui/react-components'
import App from './App.tsx'

const customTheme: Theme = {
  ...webDarkTheme,
  fontFamilyBase: "'IBM Plex Mono', monospace",
  fontFamilyMonospace: "'IBM Plex Mono', monospace",
  fontFamilyNumeric: "'IBM Plex Mono', monospace",
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FluentProvider theme={customTheme} style={{ height: '100%' }}>
      <App />
    </FluentProvider>
  </StrictMode>,
)
