import { useEffect, useMemo, useRef } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Icon } from '@/components/atoms/Icon'
import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'
import { useUIStore, type ToastKind, type ToastMessage } from '@/stores/ui.store'

interface ToastContainerProps {
  maxVisible?: number
  durationMs?: number
  style?: StyleProp<ViewStyle>
}

const iconByKind: Record<ToastKind, 'checkmark-circle' | 'alert-circle' | 'warning' | 'information-circle'> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  warning: 'warning',
  info: 'information-circle'
}

export function ToastContainer({
  maxVisible = 3,
  durationMs = 3200,
  style
}: ToastContainerProps) {
  const insets = useSafeAreaInsets()
  const { colors, tokens } = useTheme()
  const toasts = useUIStore((state) => state.toasts)
  const popToast = useUIStore((state) => state.popToast)
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const visibleToasts = useMemo<ToastMessage[]>(() => {
    return toasts.slice(-maxVisible)
  }, [maxVisible, toasts])

  useEffect(() => {
    const activeIds = new Set(visibleToasts.map((toast) => toast.id))

    for (const toast of visibleToasts) {
      if (timersRef.current[toast.id]) {
        continue
      }

      timersRef.current[toast.id] = setTimeout(() => {
        popToast(toast.id)
      }, durationMs)
    }

    Object.entries(timersRef.current).forEach(([id, timer]) => {
      if (!activeIds.has(id)) {
        clearTimeout(timer)
        delete timersRef.current[id]
      }
    })
  }, [durationMs, popToast, visibleToasts])

  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach((timer) => {
        clearTimeout(timer)
      })
      timersRef.current = {}
    }
  }, [])

  const toneMap = {
    success: {
      background: colors.success,
      textTone: 'onBrand' as const
    },
    error: {
      background: colors.error,
      textTone: 'onBrand' as const
    },
    warning: {
      background: colors.warning,
      textTone: 'onBrand' as const
    },
    info: {
      background: colors.interactiveAccent,
      textTone: 'onBrand' as const
    }
  }

  const styles = StyleSheet.create({
    root: {
      gap: tokens.spacing.xs,
      left: tokens.spacing.md,
      position: 'absolute',
      right: tokens.spacing.md,
      top: insets.top + tokens.spacing.sm,
      zIndex: 1000
    },
    toast: {
      alignItems: 'center',
      borderRadius: tokens.radius.md,
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      minHeight: 48,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm
    },
    content: {
      flex: 1
    }
  })

  if (visibleToasts.length === 0) {
    return null
  }

  return (
    <View pointerEvents="box-none" style={[styles.root, style]}>
      {visibleToasts.map((toast) => {
        const variant = toneMap[toast.kind]

        return (
          <Pressable
            key={toast.id}
            accessibilityRole="button"
            onPress={() => popToast(toast.id)}
            style={[styles.toast, { backgroundColor: variant.background }]}
          >
            <Icon name={iconByKind[toast.kind]} tone="onBrand" />
            <View style={styles.content}>
              <Text tone={variant.textTone}>{toast.message}</Text>
            </View>
          </Pressable>
        )
      })}
    </View>
  )
}
