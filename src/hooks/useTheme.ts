import { useMemo } from 'react'
import { useColorScheme } from 'react-native'

import { useConfig } from '@/hooks/useConfig'
import { createSemanticColors, tokens } from '@/theme'
import type { ThemeResolvedMode } from '@/types/config'
import { useUIStore } from '@/stores/ui.store'

export const useTheme = () => {
  const config = useConfig()
  const systemScheme = useColorScheme()
  const selectedThemeMode = useUIStore((state) => state.themeMode)
  const setThemeMode = useUIStore((state) => state.setThemeMode)

  const resolvedMode = useMemo<ThemeResolvedMode>(() => {
    const activeMode = selectedThemeMode === 'system' ? config.theme.defaultMode : selectedThemeMode

    if (activeMode === 'system') {
      return systemScheme === 'dark' ? 'dark' : 'light'
    }

    return activeMode
  }, [config.theme.defaultMode, selectedThemeMode, systemScheme])

  const colors = useMemo(() => {
    return createSemanticColors(resolvedMode, config.theme.colors)
  }, [config.theme.colors, resolvedMode])

  return {
    colors,
    mode: resolvedMode,
    tokens,
    setThemeMode
  }
}
