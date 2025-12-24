import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './i18n/i18n'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext'
import { SocketProvider } from './context/SocketContext'; // <--- IMPORTAR

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <SocketProvider> {/* <--- ENVOLVER AQUÍ */}
           <App />
        </SocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
)