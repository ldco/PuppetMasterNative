import { StyleSheet, View } from 'react-native'

import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'

type BadgeTone = 'neutral' | 'success' | 'warning' | 'error' | 'brand'

interface BadgeProps {
  label: string
  tone?: BadgeTone
}

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { colors, tokens } = useTheme()

  const colorMap = {
    neutral: {
      backgroundColor: colors.backgroundElevated,
      borderColor: colors.border,
      textTone: 'secondary' as const
    },
    success: {
      backgroundColor: colors.success,
      borderColor: colors.success,
      textTone: 'onBrand' as const
    },
    warning: {
      backgroundColor: colors.warning,
      borderColor: colors.warning,
      textTone: 'onBrand' as const
    },
    error: {
      backgroundColor: colors.error,
      borderColor: colors.error,
      textTone: 'onBrand' as const
    },
    brand: {
      backgroundColor: colors.interactiveBrand,
      borderColor: colors.interactiveBrand,
      textTone: 'onBrand' as const
    }
  }

  const variant = colorMap[tone]

  const styles = StyleSheet.create({
    root: {
      alignSelf: 'flex-start',
      backgroundColor: variant.backgroundColor,
      borderColor: variant.borderColor,
      borderRadius: tokens.radius.pill,
      borderWidth: 1,
      minHeight: 28,
      paddingHorizontal: tokens.spacing.sm,
      paddingVertical: 4
    }
  })

  return (
    <View style={styles.root}>
      <Text tone={variant.textTone} variant="caption">{label}</Text>
    </View>
  )
}
