import type { ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Divider } from '@/components/atoms/Divider'
import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'

interface ListItemProps {
  title: string
  subtitle?: string
  leading?: ReactNode
  trailing?: ReactNode
  onPress?: () => void
  disabled?: boolean
  showDivider?: boolean
}

export function ListItem({
  title,
  subtitle,
  leading,
  trailing,
  onPress,
  disabled = false,
  showDivider = false
}: ListItemProps) {
  const { tokens } = useTheme()
  const isInteractive = Boolean(onPress) && !disabled

  const styles = StyleSheet.create({
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      minHeight: 56,
      opacity: disabled ? 0.5 : 1,
      paddingVertical: tokens.spacing.xs
    },
    pressed: {
      opacity: 0.75
    },
    leading: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 28
    },
    content: {
      flex: 1,
      gap: 2
    },
    trailing: {
      alignItems: 'center',
      justifyContent: 'center'
    }
  })

  return (
    <View>
      <Pressable
        accessibilityRole={isInteractive ? 'button' : undefined}
        disabled={!isInteractive}
        onPress={onPress}
        style={({ pressed }) => [styles.row, pressed && isInteractive ? styles.pressed : undefined]}
      >
        {leading ? <View style={styles.leading}>{leading}</View> : null}
        <View style={styles.content}>
          <Text>{title}</Text>
          {subtitle ? (
            <Text tone="secondary" variant="caption">
              {subtitle}
            </Text>
          ) : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </Pressable>
      {showDivider ? <Divider inset={leading ? tokens.spacing.lg + 28 : 0} /> : null}
    </View>
  )
}
