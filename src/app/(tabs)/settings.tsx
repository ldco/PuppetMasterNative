import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Checkbox } from '@/components/atoms/Checkbox'
import { Divider } from '@/components/atoms/Divider'
import { Spinner } from '@/components/atoms/Spinner'
import { Switch } from '@/components/atoms/Switch'
import { Text } from '@/components/atoms/Text'
import { ListItem } from '@/components/molecules/ListItem'
import { ScreenHeader } from '@/components/organisms/ScreenHeader'
import { useAuth } from '@/hooks/useAuth'
import { useConfirm } from '@/hooks/useConfirm'
import { useTheme } from '@/hooks/useTheme'

export default function SettingsTabScreen() {
  const { colors, tokens, mode, setThemeMode } = useTheme()
  const { signOut } = useAuth()
  const { confirm } = useConfirm()

  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
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
      </View>

      <Button
        disabled={loggingOut}
        label={loggingOut ? 'Logging out...' : 'Logout'}
        variant="destructive"
        onPress={() => {
          void handleLogoutPress()
        }}
      />
      {loggingOut ? <Spinner overlay size="large" /> : null}
    </View>
  )
}
