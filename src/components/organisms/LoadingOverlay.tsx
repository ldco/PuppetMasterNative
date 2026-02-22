import { StyleSheet, View } from 'react-native'

import { Spinner } from '@/components/atoms/Spinner'
import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'

interface LoadingOverlayProps {
  visible?: boolean
  label?: string
  blocking?: boolean
}

export function LoadingOverlay({
  visible = true,
  label = 'Loading...',
  blocking = true
}: LoadingOverlayProps) {
  const { colors, tokens } = useTheme()

  if (!visible) {
    return null
  }

  const styles = StyleSheet.create({
    root: {
      alignItems: 'center',
      backgroundColor: `${colors.background}d9`,
      bottom: 0,
      gap: tokens.spacing.sm,
      justifyContent: 'center',
      left: 0,
      padding: tokens.spacing.lg,
      position: 'absolute',
      right: 0,
      top: 0
    },
    label: {
      maxWidth: 280
    }
  })

  return (
    <View pointerEvents={blocking ? 'auto' : 'none'} style={styles.root}>
      <Spinner size="large" />
      <Text align="center" style={styles.label} tone="secondary">
        {label}
      </Text>
    </View>
  )
}
