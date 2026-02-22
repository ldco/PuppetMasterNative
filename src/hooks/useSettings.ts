import type { SettingsPreferences } from '@/services/settings.service'
import { useSettingsStore } from '@/stores/settings.store'

interface UseSettingsResult extends SettingsPreferences {
  setNotificationsEnabled: (enabled: boolean) => void
  setAnalyticsEnabled: (enabled: boolean) => void
  resetSettings: () => void
}

export const useSettings = (): UseSettingsResult => {
  const notificationsEnabled = useSettingsStore((state) => state.notificationsEnabled)
  const analyticsEnabled = useSettingsStore((state) => state.analyticsEnabled)
  const setNotificationsEnabled = useSettingsStore((state) => state.setNotificationsEnabled)
  const setAnalyticsEnabled = useSettingsStore((state) => state.setAnalyticsEnabled)
  const resetSettings = useSettingsStore((state) => state.resetSettings)

  return {
    notificationsEnabled,
    analyticsEnabled,
    setNotificationsEnabled,
    setAnalyticsEnabled,
    resetSettings
  }
}
