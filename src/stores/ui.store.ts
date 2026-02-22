import { create } from 'zustand'

import type { ThemeMode } from '@/types/config'

export type ToastKind = 'success' | 'error' | 'warning' | 'info'
export type ConfirmTone = 'default' | 'destructive'

export interface ToastMessage {
  id: string
  kind: ToastKind
  message: string
}

export interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

export interface ConfirmDialogState {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  tone: ConfirmTone
}

interface UIState {
  themeMode: ThemeMode
  toasts: ToastMessage[]
  confirmDialog: ConfirmDialogState | null
  setThemeMode: (mode: ThemeMode) => void
  pushToast: (toast: Omit<ToastMessage, 'id'>) => string
  popToast: (id: string) => void
  requestConfirm: (options: ConfirmOptions) => Promise<boolean>
  resolveConfirm: (confirmed: boolean) => void
}

let pendingConfirmResolver: ((confirmed: boolean) => void) | null = null

export const useUIStore = create<UIState>((set) => ({
  themeMode: 'system',
  toasts: [],
  confirmDialog: null,
  setThemeMode: (mode) => {
    set({ themeMode: mode })
  },
  pushToast: (toast) => {
    const id = `toast-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    set((state) => ({
      toasts: [...state.toasts.slice(-4), { ...toast, id }]
    }))
    return id
  },
  popToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((toast) => toast.id !== id)
    }))
  },
  requestConfirm: (options) => {
    if (pendingConfirmResolver) {
      pendingConfirmResolver(false)
      pendingConfirmResolver = null
    }

    set({
      confirmDialog: {
        title: options.title,
        message: options.message,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        cancelLabel: options.cancelLabel ?? 'Cancel',
        tone: options.tone ?? 'default'
      }
    })

    return new Promise<boolean>((resolve) => {
      pendingConfirmResolver = resolve
    })
  },
  resolveConfirm: (confirmed) => {
    if (pendingConfirmResolver) {
      pendingConfirmResolver(confirmed)
      pendingConfirmResolver = null
    }

    set({ confirmDialog: null })
  }
}))
