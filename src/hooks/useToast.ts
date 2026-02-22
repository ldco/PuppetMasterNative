import { useCallback } from 'react'

import { useUIStore } from '@/stores/ui.store'
import type { ToastKind } from '@/stores/ui.store'

export const useToast = () => {
  const pushToast = useUIStore((state) => state.pushToast)

  const toast = useCallback(
    (message: string, kind: ToastKind = 'info'): string => {
      return pushToast({ kind, message })
    },
    [pushToast]
  )

  return { toast }
}
