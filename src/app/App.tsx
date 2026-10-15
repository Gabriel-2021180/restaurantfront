import { QueryClientProvider } from '@tanstack/react-query'
import { I18nextProvider } from 'react-i18next'
import i18n from '@/i18n/i18n'
import { queryClient } from '@/lib/query-client'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { AuthProvider } from '@/app/providers/AuthProvider'
import { SocketProvider } from '@/app/providers/SocketProvider'
import { BrandingLiveUpdates, BrandingProvider } from '@/app/providers/BrandingProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { ConfirmHost } from '@/components/feedback/confirm'
import { AppRouter } from '@/app/router'

export default function App() {
  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrandingProvider>
            <AuthProvider>
              <SocketProvider>
                <BrandingLiveUpdates />
                <TooltipProvider delayDuration={300}>
                  <AppRouter />
                  <Toaster />
                  <ConfirmHost />
                </TooltipProvider>
              </SocketProvider>
            </AuthProvider>
          </BrandingProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>
  )
}
