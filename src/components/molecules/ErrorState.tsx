import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Icon } from '@/components/atoms/Icon'
import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'

interface ErrorStateProps {
  title?: string
  description: string
  retryLabel?: string
  onRetry?: () => void
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  retryLabel = 'Retry',
  onRetry
}: ErrorStateProps) {
  const { tokens } = useTheme()

  const styles = StyleSheet.create({
    root: {
      alignItems: 'center',
      gap: tokens.spacing.sm,
      paddingVertical: tokens.spacing.lg
    },
    textGroup: {
      alignItems: 'center',
      gap: tokens.spacing.xs
    },
    description: {
      maxWidth: 300
    }
  })

  return (
    <View style={styles.root}>
      <Icon name="alert-circle-outline" size={28} tone="error" />
      <View style={styles.textGroup}>
        <Text align="center" variant="h3">
          {title}
        </Text>
        <Text align="center" style={styles.description} tone="secondary">
          {description}
        </Text>
      </View>
      {onRetry ? <Button label={retryLabel} onPress={onRetry} variant="outline" size="sm" /> : null}
    </View>
  )
}
