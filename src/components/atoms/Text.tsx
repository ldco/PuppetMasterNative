import { Text as RNText, StyleSheet } from 'react-native'
import type { StyleProp, TextStyle } from 'react-native'
import type { ReactNode } from 'react'

import { useTheme } from '@/hooks/useTheme'

type TextVariant = 'h1' | 'h2' | 'h3' | 'body' | 'caption' | 'label'
type TextTone = 'primary' | 'secondary' | 'muted' | 'brand' | 'error' | 'onBrand'

interface TextProps {
  children: ReactNode
  variant?: TextVariant
  tone?: TextTone
  align?: 'left' | 'center' | 'right'
  numberOfLines?: number
  style?: StyleProp<TextStyle>
}

export function Text({
  children,
  variant = 'body',
  tone = 'primary',
  align = 'left',
  numberOfLines,
  style
}: TextProps) {
  const { colors, tokens } = useTheme()

  const styles = StyleSheet.create({
    base: {
      textAlign: align
    },
    h1: {
      fontSize: tokens.typography.h1,
      fontWeight: '700'
    },
    h2: {
      fontSize: tokens.typography.title,
      fontWeight: '700'
    },
    h3: {
      fontSize: tokens.typography.body,
      fontWeight: '700'
    },
    body: {
      fontSize: tokens.typography.body,
      fontWeight: '400'
    },
    caption: {
      fontSize: 12,
      fontWeight: '400'
    },
    label: {
      fontSize: tokens.typography.label,
      fontWeight: '600'
    },
    primary: {
      color: colors.textPrimary
    },
    secondary: {
      color: colors.textSecondary
    },
    muted: {
      color: colors.textSecondary,
      opacity: 0.8
    },
    brand: {
      color: colors.interactiveBrand
    },
    error: {
      color: colors.error
    },
    onBrand: {
      color: colors.textOnBrand
    }
  })

  return (
    <RNText numberOfLines={numberOfLines} style={[styles.base, styles[variant], styles[tone], style]}>
      {children}
    </RNText>
  )
}
