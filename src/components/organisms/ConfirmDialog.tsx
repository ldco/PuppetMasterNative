import { Modal, Pressable, StyleSheet, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'
import { useUIStore } from '@/stores/ui.store'

export function ConfirmDialog() {
  const { colors, tokens } = useTheme()
  const confirmDialog = useUIStore((state) => state.confirmDialog)
  const resolveConfirm = useUIStore((state) => state.resolveConfirm)

  const styles = StyleSheet.create({
    overlay: {
      alignItems: 'center',
      backgroundColor: `${colors.background}cc`,
      flex: 1,
      justifyContent: 'center',
      padding: tokens.spacing.lg
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      gap: tokens.spacing.md,
      maxWidth: 420,
      padding: tokens.spacing.lg,
      width: '100%'
    },
    actions: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      justifyContent: 'flex-end'
    }
  })

  if (!confirmDialog) {
    return null
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={() => resolveConfirm(false)}
      transparent
      visible
    >
      <View style={styles.overlay}>
        <Pressable onPress={() => resolveConfirm(false)} style={styles.backdrop} />
        <View style={styles.card}>
          <Text variant="h3">{confirmDialog.title}</Text>
          <Text tone="secondary">{confirmDialog.message}</Text>
          <View style={styles.actions}>
            <Button
              label={confirmDialog.cancelLabel}
              onPress={() => resolveConfirm(false)}
              size="sm"
              variant="outline"
            />
            <Button
              label={confirmDialog.confirmLabel}
              onPress={() => resolveConfirm(true)}
              size="sm"
              variant={confirmDialog.tone === 'destructive' ? 'destructive' : 'primary'}
            />
          </View>
        </View>
      </View>
    </Modal>
  )
}
