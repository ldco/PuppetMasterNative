import { create } from 'zustand'

import {
  defaultSettingsPreferences,
  settingsService,
  type SettingsPreferences
} from '@/services/settings.service'

interface SettingsState extends SettingsPreferences {
  setNotificationsEnabled: (enabled: boolean) => void
  setAnalyticsEnabled: (enabled: boolean) => void
  resetSettings: () => void
}

const persistPreferences = (preferences: SettingsPreferences): void => {
  settingsService.savePreferences(preferences)
}

const buildNextPreferences = (
  current: SettingsPreferences,
  updates: Partial<SettingsPreferences>
): SettingsPreferences => {
  return { ...current, ...updates }
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...settingsService.loadPreferences(),
  setNotificationsEnabled: (enabled) => {
    set((state) => {
      const next = buildNextPreferences(state, { notificationsEnabled: enabled })
      persistPreferences(next)
      return next
    })
  },
  setAnalyticsEnabled: (enabled) => {
    set((state) => {
      const next = buildNextPreferences(state, { analyticsEnabled: enabled })
      persistPreferences(next)
      return next
    })
  },
  resetSettings: () => {
    persistPreferences(defaultSettingsPreferences)
    set(defaultSettingsPreferences)
  }
}))
