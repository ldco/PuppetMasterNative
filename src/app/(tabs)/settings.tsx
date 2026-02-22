import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Checkbox } from '@/components/atoms/Checkbox'
import { Divider } from '@/components/atoms/Divider'
import { Switch } from '@/components/atoms/Switch'
import { Text } from '@/components/atoms/Text'
import { ListItem } from '@/components/molecules/ListItem'
import { LoadingOverlay } from '@/components/organisms/LoadingOverlay'
import { BottomSheet } from '@/components/organisms/BottomSheet'
import { ScreenHeader } from '@/components/organisms/ScreenHeader'
import { useAuth } from '@/hooks/useAuth'
import { useConfirm } from '@/hooks/useConfirm'
import { useSettings } from '@/hooks/useSettings'
import { useTheme } from '@/hooks/useTheme'

export default function SettingsTabScreen() {
  const { colors, tokens, mode, setThemeMode } = useTheme()
  const { signOut } = useAuth()
  const { confirm } = useConfirm()
  const {
    analyticsEnabled,
    notificationsEnabled,
    resetSettings,
    setAnalyticsEnabled,
    setNotificationsEnabled
  } = useSettings()

  const [loggingOut, setLoggingOut] = useState(false)
  const [showThemeHelp, setShowThemeHelp] = useState(false)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const styles = StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg
    },
    section: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      gap: tokens.spacing.sm,
      padding: tokens.spacing.md
    },
    buttonRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm
    }
  })

  const performLogout = async (): Promise<void> => {
    if (loggingOut) {
      return
    }

    try {
      setLoggingOut(true)
      await signOut()
    } finally {
      if (isMountedRef.current) {
        setLoggingOut(false)
      }
    }
  }

  const handleLogoutPress = async (): Promise<void> => {
    const confirmed = await confirm({
      title: 'Log out?',
      message: 'You will need to sign in again to continue.',
      confirmLabel: 'Logout',
      cancelLabel: 'Cancel',
      tone: 'destructive'
    })

    if (!confirmed) {
      return
    }

    await performLogout()
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader subtitle="Personal preferences and account actions." title="Settings" />

      <View style={styles.section}>
        <Text tone="secondary">Active theme: {mode}</Text>
        <Divider />
        <View style={styles.buttonRow}>
          <Button label="System" variant="outline" onPress={() => setThemeMode('system')} />
          <Button label="Light" variant="outline" onPress={() => setThemeMode('light')} />
          <Button label="Dark" variant="outline" onPress={() => setThemeMode('dark')} />
          <Button
            label="Theme help"
            variant="outline"
            size="sm"
            onPress={() => setShowThemeHelp(true)}
          />
        </View>
      </View>

      <View style={styles.section}>
        <ListItem
          showDivider
          subtitle="Receive security and account alerts"
          title="Push notifications"
          trailing={<Switch onValueChange={setNotificationsEnabled} value={notificationsEnabled} />}
        />
        <Checkbox
          checked={analyticsEnabled}
          label="Share anonymous analytics"
          onToggle={setAnalyticsEnabled}
        />
        <Divider />
        <Button
          label="Reset local preferences"
          onPress={resetSettings}
          size="sm"
          variant="outline"
        />
      </View>

      <Button
        disabled={loggingOut}
        label={loggingOut ? 'Logging out...' : 'Logout'}
        variant="destructive"
        onPress={() => {
          void handleLogoutPress()
        }}
      />
      <LoadingOverlay label="Logging out..." visible={loggingOut} />

      <BottomSheet
        footer={
          <Button
            label="Close"
            onPress={() => setShowThemeHelp(false)}
            size="sm"
            variant="outline"
          />
        }
        onClose={() => setShowThemeHelp(false)}
        subtitle="Theme mode affects all screens through PMNative design tokens."
        title="Theme Mode Help"
        visible={showThemeHelp}
      >
        <Text tone="secondary">
          `System` follows the device setting. `Light` and `Dark` force a mode override stored in local app UI state.
        </Text>
      </BottomSheet>
    </View>
  )
}
