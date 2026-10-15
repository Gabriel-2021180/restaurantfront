import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useTheme } from '@/app/providers/ThemeProvider'

/** Avisos del sistema: superficie neutra, ícono de estado en su color, sin emojis. */
export function Toaster(props: ToasterProps) {
  const { theme } = useTheme()
  return (
    <Sonner
      theme={theme}
      position="top-center"
      gap={8}
      icons={{
        success: <CircleCheck className="size-[18px] text-success" />,
        error: <CircleAlert className="size-[18px] text-destructive" />,
        warning: <TriangleAlert className="size-[18px] text-warning" />,
        info: <Info className="size-[18px] text-info" />,
        loading: <LoaderCircle className="size-[18px] animate-spin text-muted-foreground" />,
      }}
      toastOptions={{
        classNames: {
          toast:
            '!bg-card !text-card-foreground !border !border-border !rounded-xl !shadow-[0_8px_24px_-12px_rgb(0_0_0/0.18)] !font-sans !gap-3 !items-start !py-3 !px-4',
          title: '!font-semibold !text-[14px] !leading-5',
          description: '!text-muted-foreground !text-[13px]',
          icon: '!mt-px',
          actionButton: '!bg-primary !text-primary-foreground !rounded-md !font-semibold',
          cancelButton: '!bg-secondary !text-secondary-foreground !rounded-md',
          closeButton: '!bg-card !border-border !text-muted-foreground',
        },
      }}
      {...props}
    />
  )
}
