import { StyleSheet, View } from 'react-native'
import type { ReactNode } from 'react'

import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'

interface CardProps {
  children: ReactNode
  title?: string
  subtitle?: string
  headerTrailing?: ReactNode
  footer?: ReactNode
}

export function Card({ children, title, subtitle, headerTrailing, footer }: CardProps) {
  const { colors, tokens } = useTheme()

  const styles = StyleSheet.create({
    root: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      gap: tokens.spacing.sm,
      padding: tokens.spacing.md
    },
    headerRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      justifyContent: 'space-between'
    },
    headerText: {
      flex: 1
    },
    title: {
      marginBottom: 2
    },
    subtitle: {
      marginBottom: tokens.spacing.xs
    },
    footer: {
      marginTop: tokens.spacing.xs
    }
  })

  return (
    <View style={styles.root}>
      {title || subtitle || headerTrailing ? (
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            {title ? (
              <Text variant="h3" style={styles.title}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text tone="secondary" variant="caption" style={styles.subtitle}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {headerTrailing}
        </View>
      ) : null}
      {children}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  )
}
