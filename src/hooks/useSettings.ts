import { useEffect, useState } from 'react'

import {
  SETTINGS_ANALYTICS_ENABLED_KEY,
  SETTINGS_NOTIFICATIONS_ENABLED_KEY
} from '@/services/settings.constants'
import { storageService } from '@/services/storage.service'

interface SettingsPreferences {
  notificationsEnabled: boolean
  analyticsEnabled: boolean
}

interface UseSettingsResult extends SettingsPreferences {
  setNotificationsEnabled: (enabled: boolean) => void
  setAnalyticsEnabled: (enabled: boolean) => void
  resetSettings: () => void
}

const parseBooleanSetting = (value: string | null, fallback: boolean): boolean => {
  if (value === 'true') {
    return true
  }

  if (value === 'false') {
    return false
  }

  return fallback
}

const loadInitialPreferences = (): SettingsPreferences => {
  return {
    notificationsEnabled: parseBooleanSetting(
      storageService.getItem(SETTINGS_NOTIFICATIONS_ENABLED_KEY),
      true
    ),
    analyticsEnabled: parseBooleanSetting(storageService.getItem(SETTINGS_ANALYTICS_ENABLED_KEY), false)
  }
}

export const useSettings = (): UseSettingsResult => {
  const [preferences, setPreferences] = useState<SettingsPreferences>(() => loadInitialPreferences())

  useEffect(() => {
    storageService.setItem(
      SETTINGS_NOTIFICATIONS_ENABLED_KEY,
      preferences.notificationsEnabled ? 'true' : 'false'
    )
  }, [preferences.notificationsEnabled])

  useEffect(() => {
    storageService.setItem(
      SETTINGS_ANALYTICS_ENABLED_KEY,
      preferences.analyticsEnabled ? 'true' : 'false'
    )
  }, [preferences.analyticsEnabled])

  return {
    ...preferences,
    setNotificationsEnabled: (enabled) => {
      setPreferences((current) => ({ ...current, notificationsEnabled: enabled }))
    },
    setAnalyticsEnabled: (enabled) => {
      setPreferences((current) => ({ ...current, analyticsEnabled: enabled }))
    },
    resetSettings: () => {
      setPreferences({
        notificationsEnabled: true,
        analyticsEnabled: false
      })
    }
  }
}
