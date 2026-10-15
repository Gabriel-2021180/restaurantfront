import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Languages } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { DevCredit } from '@/components/brand/DevCredit'
import { Button } from '@/components/ui/button'

/** Marco de las pantallas de acceso: marca del restaurante, contenido centrado y crédito discreto. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation()
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="aguayo-thread" aria-hidden />
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <BrandMark />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => i18n.changeLanguage(i18n.language.startsWith('es') ? 'en' : 'es')}
          aria-label="Idioma / Language"
        >
          <Languages /> <span className="uppercase">{i18n.language.slice(0, 2)}</span>
        </Button>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-8">
        <div className="w-full max-w-[400px]">{children}</div>
      </main>
      <footer className="px-5 pt-2 pb-6">
        <DevCredit />
      </footer>
    </div>
  )
}
