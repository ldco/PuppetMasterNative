import { Pressable, StyleSheet, Text } from 'react-native'

import { useTheme } from '@/hooks/useTheme'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'destructive'

type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps {
  label: string
  onPress: () => void
  disabled?: boolean
  variant?: ButtonVariant
  size?: ButtonSize
}

const sizeStyles = StyleSheet.create({
  sm: {
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  md: {
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  lg: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 12
  }
})

export function Button({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'md'
}: ButtonProps) {
  const { colors, tokens } = useTheme()

  const styles = StyleSheet.create({
    base: {
      alignItems: 'center',
      borderRadius: tokens.radius.md,
      justifyContent: 'center'
    },
    pressed: {
      opacity: 0.85
    },
    disabled: {
      opacity: 0.5
    },
    primary: {
      backgroundColor: colors.interactiveBrand
    },
    secondary: {
      backgroundColor: colors.interactiveAccent
    },
    outline: {
      backgroundColor: 'transparent',
      borderColor: colors.border,
      borderWidth: 1
    },
    destructive: {
      backgroundColor: colors.error
    },
    textOnSolid: {
      color: colors.textOnBrand,
      fontSize: tokens.typography.label,
      fontWeight: '600'
    },
    textOnOutline: {
      color: colors.textPrimary,
      fontSize: tokens.typography.label,
      fontWeight: '600'
    }
  })

  const textStyle = variant === 'outline' ? styles.textOnOutline : styles.textOnSolid

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        styles[variant],
        pressed ? styles.pressed : undefined,
        disabled ? styles.disabled : undefined
      ]}
    >
      <Text style={textStyle}>{label}</Text>
    </Pressable>
  )
}
