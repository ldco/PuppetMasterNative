import { useState } from 'react'
import * as Clipboard from 'expo-clipboard'
import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { ListItem } from '@/components/molecules/ListItem'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { BottomSheet } from '@/components/organisms/BottomSheet'
import { useBackendDiagnostics } from '@/hooks/useBackendDiagnostics'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import { useConfig } from '@/hooks/useConfig'
import { useSettings } from '@/hooks/useSettings'
import { settingsService } from '@/services/settings.service'
import { useAuthStore } from '@/stores/auth.store'

export default function AdminSettingsScreen() {
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const config = useConfig()
  const activeUser = useAuthStore((state) => state.user)
  const { analyticsEnabled, notificationsEnabled } = useSettings()
  const backendDiagnostics = useBackendDiagnostics()
  const [showSyncSheet, setShowSyncSheet] = useState(false)
  const syncPreview = settingsService.buildSyncPreview({
    preferences: {
      notificationsEnabled,
      analyticsEnabled
    },
    backendProvider: config.backend.provider,
    hasAdminModule: config.hasAdmin,
    actor: activeUser
      ? {
          id: activeUser.id,
          email: activeUser.email,
          role: activeUser.role
        }
      : null,
    hasRemoteSyncEndpoint: false
  })

  const styles = StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg
    },
    list: {
      gap: tokens.spacing.xs
    },
    sheetContent: {
      gap: tokens.spacing.sm
    }
  })

  const copyDiagnosticValue = async (label: string, value: string): Promise<void> => {
    try {
      await Clipboard.setStringAsync(value)
      toast(`${label} copied`, 'success')
    } catch {
      toast(`Failed to copy ${label.toLowerCase()}`, 'error')
    }
  }

  return (
    <View style={styles.screen}>
      <SectionHeader
        subtitle="Feature flags and bootstrap configuration overview."
        title="Admin Settings"
      />

      <Card
        footer={<Text tone="muted" variant="caption">Settings API wiring is pending in Phase 3.</Text>}
        headerTrailing={<Badge label={config.hasAdmin ? 'enabled' : 'disabled'} tone={config.hasAdmin ? 'success' : 'neutral'} />}
        subtitle="Runtime flags"
        title="Framework Features"
      >
        <View style={styles.list}>
          <ListItem
            showDivider
            subtitle="Authentication module"
            title="Auth"
            trailing={<Badge label={config.features.auth ? 'on' : 'off'} tone={config.features.auth ? 'success' : 'neutral'} />}
          />
          <ListItem
            showDivider
            subtitle="User self-registration"
            title="Registration"
            trailing={<Badge label={config.features.registration ? 'on' : 'off'} tone={config.features.registration ? 'success' : 'neutral'} />}
          />
          <ListItem
            subtitle="Reset password flow"
            title="Forgot Password"
            trailing={<Badge label={config.features.forgotPassword ? 'on' : 'off'} tone={config.features.forgotPassword ? 'success' : 'neutral'} />}
          />
        </View>
      </Card>

      <Card title="Admin Actions">
        <ListItem
          onPress={() => setShowSyncSheet(true)}
          subtitle="Stub for future server-side sync endpoint"
          title="Sync settings with backend"
          trailing={<Badge label="todo" tone="warning" />}
        />
      </Card>

      <Card
        subtitle="Provider + environment readiness for local setup"
        title="Backend Diagnostics"
      >
        <View style={styles.list}>
          {backendDiagnostics.items.map((item, index) => {
            const copyValue = item.copyValue

            return (
              <ListItem
                key={item.key}
                onPress={
                  copyValue
                    ? () => {
                        void copyDiagnosticValue(item.copyToastLabel ?? item.label, copyValue)
                      }
                    : undefined
                }
                showDivider={index < backendDiagnostics.items.length - 1}
                subtitle={copyValue ? `${item.detail} • Tap to copy` : item.detail}
                title={item.label}
                trailing={
                  <Badge
                    label={item.status}
                    tone={
                      item.status === 'ok'
                        ? 'success'
                        : item.status === 'warning'
                          ? 'warning'
                          : item.status === 'error'
                            ? 'error'
                            : 'neutral'
                    }
                  />
                }
              />
            )
          })}
        </View>
      </Card>

      <BottomSheet
        footer={
          <Button
            label="Close"
            onPress={() => setShowSyncSheet(false)}
            size="sm"
            variant="outline"
          />
        }
        onClose={() => setShowSyncSheet(false)}
        subtitle={syncPreview.summary}
        title="Settings Sync Preview"
        visible={showSyncSheet}
      >
        <View style={styles.sheetContent}>
          {syncPreview.rows.map((row, index) => (
            <ListItem
              key={row.key}
              showDivider={index < syncPreview.rows.length - 1}
              subtitle={row.value}
              title={row.label}
              trailing={
                <Badge
                  label={row.status}
                  tone={
                    row.status === 'ok'
                      ? 'success'
                      : row.status === 'warning'
                        ? 'warning'
                        : 'neutral'
                  }
                />
              }
            />
          ))}
          <Text tone={syncPreview.status === 'warning' ? 'secondary' : 'muted'} variant="caption">
            Next step: {syncPreview.nextStep}
          </Text>
        </View>
      </BottomSheet>
    </View>
  )
}
