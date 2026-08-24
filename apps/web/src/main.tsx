import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/vietnamese-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/vietnamese-500.css'
import '@fontsource/roboto/latin-600.css'
import '@fontsource/roboto/vietnamese-600.css'
import '@fontsource/roboto/latin-700.css'
import '@fontsource/roboto/vietnamese-700.css'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><BrowserRouter><App /></BrowserRouter></React.StrictMode>,
)
