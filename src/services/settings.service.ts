import {
  SETTINGS_ANALYTICS_ENABLED_KEY,
  SETTINGS_NOTIFICATIONS_ENABLED_KEY
} from '@/services/settings.constants'
import { storageService } from '@/services/storage.service'

export interface SettingsPreferences {
  notificationsEnabled: boolean
  analyticsEnabled: boolean
}

export const defaultSettingsPreferences: SettingsPreferences = {
  notificationsEnabled: true,
  analyticsEnabled: false
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

export const settingsService = {
  loadPreferences(): SettingsPreferences {
    return {
      notificationsEnabled: parseBooleanSetting(
        storageService.getItem(SETTINGS_NOTIFICATIONS_ENABLED_KEY),
        defaultSettingsPreferences.notificationsEnabled
      ),
      analyticsEnabled: parseBooleanSetting(
        storageService.getItem(SETTINGS_ANALYTICS_ENABLED_KEY),
        defaultSettingsPreferences.analyticsEnabled
      )
    }
  },

  savePreferences(preferences: SettingsPreferences): void {
    storageService.setItem(
      SETTINGS_NOTIFICATIONS_ENABLED_KEY,
      preferences.notificationsEnabled ? 'true' : 'false'
    )
    storageService.setItem(
      SETTINGS_ANALYTICS_ENABLED_KEY,
      preferences.analyticsEnabled ? 'true' : 'false'
    )
  }
}
