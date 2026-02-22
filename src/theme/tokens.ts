import { pmNativeConfig } from '@/pm-native.config'

export interface ThemePrimitives {
  colors: {
    black: string
    white: string
    brand: string
    accent: string
  }
  spacing: {
    xs: number
    sm: number
    md: number
    lg: number
    xl: number
  }
  radius: {
    sm: number
    md: number
    lg: number
    pill: number
  }
  typography: {
    body: number
    label: number
    title: number
    h1: number
  }
}

export const tokens: ThemePrimitives = {
  colors: pmNativeConfig.theme.colors,
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24
  },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    pill: 999
  },
  typography: {
    body: 16,
    label: 14,
    title: 20,
    h1: 28
  }
}
