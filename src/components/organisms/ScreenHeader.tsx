import type { ComponentProps } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Icon } from '@/components/atoms/Icon'
import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'

type IconName = ComponentProps<typeof Icon>['name']

interface ScreenHeaderProps {
  title: string
  subtitle?: string
  actionIcon?: IconName
  onActionPress?: () => void
  actionA11yLabel?: string
}

export function ScreenHeader({
  title,
  subtitle,
  actionIcon,
  onActionPress,
  actionA11yLabel = 'Header action'
}: ScreenHeaderProps) {
  const { tokens } = useTheme()
  const action = actionIcon && onActionPress
    ? { icon: actionIcon, onPress: onActionPress }
    : null

  const styles = StyleSheet.create({
    root: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      justifyContent: 'space-between'
    },
    textGroup: {
      flex: 1,
      gap: tokens.spacing.xs
    },
    actionButton: {
      alignItems: 'center',
      height: 44,
      justifyContent: 'center',
      width: 44
    }
  })

  return (
    <View style={styles.root}>
      <View style={styles.textGroup}>
        <Text variant="h2">{title}</Text>
        {subtitle ? <Text tone="secondary">{subtitle}</Text> : null}
      </View>
      {action ? (
        <Pressable
          accessibilityLabel={actionA11yLabel}
          accessibilityRole="button"
          onPress={action.onPress}
          style={styles.actionButton}
        >
          <Icon name={action.icon} tone="secondary" />
        </Pressable>
      ) : null}
    </View>
  )
}
