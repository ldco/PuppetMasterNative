import type { ComponentProps } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Icon } from '@/components/atoms/Icon'
import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'

type IconName = ComponentProps<typeof Icon>['name']

interface EmptyStateProps {
  title: string
  description?: string
  ctaLabel?: string
  onCtaPress?: () => void
  iconName?: IconName
}

export function EmptyState({
  title,
  description,
  ctaLabel,
  onCtaPress,
  iconName = 'file-tray-outline'
}: EmptyStateProps) {
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
      maxWidth: 280
    }
  })

  return (
    <View style={styles.root}>
      <Icon name={iconName} size={28} tone="secondary" />
      <View style={styles.textGroup}>
        <Text align="center" variant="h3">
          {title}
        </Text>
        {description ? (
          <Text align="center" style={styles.description} tone="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      {ctaLabel && onCtaPress ? <Button label={ctaLabel} onPress={onCtaPress} size="sm" /> : null}
    </View>
  )
}
