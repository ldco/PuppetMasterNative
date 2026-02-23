import { useState } from 'react'
import * as Clipboard from 'expo-clipboard'
import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { ListItem } from '@/components/molecules/ListItem'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { BackendDiagnosticsCard } from '@/components/organisms/BackendDiagnosticsCard'
import { BottomSheet } from '@/components/organisms/BottomSheet'
import { useSettingsSync } from '@/hooks/useSettingsSync'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import { useConfig } from '@/hooks/useConfig'
import { SettingsSyncProviderError } from '@/services/settingsSync.provider.types'

export default function AdminSettingsScreen() {
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const config = useConfig()
  const { capability, draft: syncPayloadDraft, executeSync, preview: syncPreview } = useSettingsSync()
  const [showSyncSheet, setShowSyncSheet] = useState(false)

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
    },
    sheetFooterButtons: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm
    }
  })

  const copyText = async (label: string, value: string): Promise<void> => {
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

      <BackendDiagnosticsCard />

      <BottomSheet
        footer={
          <View style={styles.sheetFooterButtons}>
            <Button
              label="Validate sync"
              onPress={() => {
                void executeSync()
                  .then(() => {
                    toast('Settings sync executed', 'success')
                  })
                  .catch((error: unknown) => {
                    if (error instanceof SettingsSyncProviderError) {
                      toast(error.message, error.code === 'NOT_SUPPORTED' ? 'warning' : 'error')
                      return
                    }

                    toast('Settings sync failed', 'error')
                  })
              }}
              size="sm"
              variant="outline"
            />
            <Button
              label="Copy payload"
              onPress={() => {
                void copyText('Sync payload', JSON.stringify(syncPayloadDraft, null, 2))
              }}
              size="sm"
              variant="secondary"
            />
            <Button
              label="Close"
              onPress={() => setShowSyncSheet(false)}
              size="sm"
              variant="outline"
            />
          </View>
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
          <Text tone="muted" variant="caption">
            Provider contract: {capability.canExecute ? 'ready' : 'not executable'} ({capability.detail})
          </Text>
          <Text tone="muted" variant="caption">
            Payload schema: `pmnative.settings.sync/1`
          </Text>
        </View>
      </BottomSheet>
    </View>
  )
}
