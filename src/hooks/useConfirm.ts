import { useCallback } from 'react'

import { useUIStore, type ConfirmOptions } from '@/stores/ui.store'

export const useConfirm = () => {
  const requestConfirm = useUIStore((state) => state.requestConfirm)

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return requestConfirm(options)
  }, [requestConfirm])

  return { confirm }
}
