import Ionicons from '@expo/vector-icons/Ionicons'
import type { ComponentProps } from 'react'

import { useTheme } from '@/hooks/useTheme'

type IoniconsName = ComponentProps<typeof Ionicons>['name']

type IconTone = 'primary' | 'secondary' | 'brand' | 'error' | 'onBrand'

interface IconProps {
  name: IoniconsName
  size?: number
  tone?: IconTone
}

export function Icon({ name, size = 20, tone = 'primary' }: IconProps) {
  const { colors } = useTheme()

  const colorMap = {
    primary: colors.textPrimary,
    secondary: colors.textSecondary,
    brand: colors.interactiveBrand,
    error: colors.error,
    onBrand: colors.textOnBrand
  }

  return <Ionicons color={colorMap[tone]} name={name} size={size} />
}
