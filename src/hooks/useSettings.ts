import { useEffect, useState } from 'react'

import {
  defaultSettingsPreferences,
  settingsService,
  type SettingsPreferences
} from '@/services/settings.service'

interface UseSettingsResult extends SettingsPreferences {
  setNotificationsEnabled: (enabled: boolean) => void
  setAnalyticsEnabled: (enabled: boolean) => void
  resetSettings: () => void
}

export const useSettings = (): UseSettingsResult => {
  const [preferences, setPreferences] = useState<SettingsPreferences>(() => settingsService.loadPreferences())

  useEffect(() => {
    settingsService.savePreferences(preferences)
  }, [preferences])

  return {
    ...preferences,
    setNotificationsEnabled: (enabled) => {
      setPreferences((current) => ({ ...current, notificationsEnabled: enabled }))
    },
    setAnalyticsEnabled: (enabled) => {
      setPreferences((current) => ({ ...current, analyticsEnabled: enabled }))
    },
    resetSettings: () => {
      setPreferences(defaultSettingsPreferences)
    }
  }
}
