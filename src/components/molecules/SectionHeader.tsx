import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'

interface SectionHeaderProps {
  title: string
  subtitle?: string
  actionLabel?: string
  onActionPress?: () => void
}

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  onActionPress
}: SectionHeaderProps) {
  const { tokens } = useTheme()
  const action = actionLabel && onActionPress
    ? { label: actionLabel, onPress: onActionPress }
    : null

  const styles = StyleSheet.create({
    root: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      justifyContent: 'space-between'
    },
    textGroup: {
      flex: 1,
      gap: tokens.spacing.xs
    }
  })

  return (
    <View style={styles.root}>
      <View style={styles.textGroup}>
        <Text variant="h2">{title}</Text>
        {subtitle ? <Text tone="secondary">{subtitle}</Text> : null}
      </View>
      {action ? <Button label={action.label} onPress={action.onPress} size="sm" variant="outline" /> : null}
    </View>
  )
}
