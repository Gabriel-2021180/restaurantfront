import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import i18n from './i18n/i18n' // Import the i18n instance
import { I18nextProvider } from 'react-i18next' // Import I18nextProvider
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext';

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <SocketProvider>
            <I18nextProvider i18n={i18n}> {/* Wrap App with I18nextProvider */}
              <App />
            </I18nextProvider>
          </SocketProvider>
        </QueryClientProvider>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>,
)