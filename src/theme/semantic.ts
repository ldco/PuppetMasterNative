import type { ColorPrimitives, ThemeResolvedMode } from '@/types/config'

export interface SemanticColors {
  background: string
  backgroundElevated: string
  surface: string
  border: string
  textPrimary: string
  textSecondary: string
  textOnBrand: string
  interactiveBrand: string
  interactiveBrandHover: string
  interactiveAccent: string
  success: string
  warning: string
  error: string
}

const clamp = (value: number): number => {
  if (value < 0) {
    return 0
  }

  if (value > 255) {
    return 255
  }

  return Math.round(value)
}

const hexToRgb = (hexColor: string): [number, number, number] => {
  const cleanHex = hexColor.replace('#', '')
  const red = Number.parseInt(cleanHex.slice(0, 2), 16)
  const green = Number.parseInt(cleanHex.slice(2, 4), 16)
  const blue = Number.parseInt(cleanHex.slice(4, 6), 16)

  return [red, green, blue]
}

const rgbToHex = (red: number, green: number, blue: number): string => {
  const toHex = (channel: number): string => clamp(channel).toString(16).padStart(2, '0')
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

const mixHex = (left: string, right: string, rightRatio: number): string => {
  const [leftR, leftG, leftB] = hexToRgb(left)
  const [rightR, rightG, rightB] = hexToRgb(right)

  const leftRatio = 1 - rightRatio

  return rgbToHex(
    leftR * leftRatio + rightR * rightRatio,
    leftG * leftRatio + rightG * rightRatio,
    leftB * leftRatio + rightB * rightRatio
  )
}

export const createSemanticColors = (
  mode: ThemeResolvedMode,
  primitives: ColorPrimitives
): SemanticColors => {
  const isLight = mode === 'light'

  return {
    background: isLight ? primitives.white : primitives.black,
    backgroundElevated: isLight
      ? mixHex(primitives.white, primitives.black, 0.05)
      : mixHex(primitives.black, primitives.white, 0.08),
    surface: isLight
      ? mixHex(primitives.white, primitives.accent, 0.02)
      : mixHex(primitives.black, primitives.white, 0.1),
    border: isLight
      ? mixHex(primitives.black, primitives.white, 0.65)
      : mixHex(primitives.white, primitives.black, 0.45),
    textPrimary: isLight ? primitives.black : primitives.white,
    textSecondary: isLight
      ? mixHex(primitives.black, primitives.white, 0.4)
      : mixHex(primitives.white, primitives.black, 0.35),
    textOnBrand: primitives.white,
    interactiveBrand: primitives.brand,
    interactiveBrandHover: mixHex(primitives.brand, primitives.black, 0.15),
    interactiveAccent: primitives.accent,
    success: '#0b7a39',
    warning: '#a36200',
    error: '#c91c1c'
  }
}
