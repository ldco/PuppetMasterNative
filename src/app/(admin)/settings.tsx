import { useState } from 'react'
import * as Clipboard from 'expo-clipboard'
import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { ErrorState } from '@/components/molecules/ErrorState'
import { ListItem } from '@/components/molecules/ListItem'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { SkeletonList } from '@/components/molecules/SkeletonList'
import { BackendDiagnosticsCard } from '@/components/organisms/BackendDiagnosticsCard'
import { BottomSheet } from '@/components/organisms/BottomSheet'
import { LoadingOverlay } from '@/components/organisms/LoadingOverlay'
import { useAdminSettingsSnapshot } from '@/hooks/useAdminSettingsSnapshot'
import { useSettingsSync } from '@/hooks/useSettingsSync'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import { useConfig } from '@/hooks/useConfig'
import { SettingsSyncProviderError } from '@/services/settingsSync.provider.types'

export default function AdminSettingsScreen() {
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const config = useConfig()
  const { capability: syncCapability, draft: syncPayloadDraft, executeSync, preview: syncPreview } =
    useSettingsSync()
  const {
    capability: adminCapability,
    error: adminSettingsError,
    isLoading: isLoadingAdminSettings,
    isRefreshing: isRefreshingAdminSettings,
    refresh: refreshAdminSettings,
    settings: adminSettingsSnapshot,
    source: adminSettingsSource,
    sourceDetail: adminSettingsSourceDetail
  } = useAdminSettingsSnapshot()
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

  const canSyncSettings = syncCapability.canExecute
  const syncActionSubtitle = canSyncSettings
    ? `Provider sync ready (${syncCapability.detail})`
    : `Sync unavailable for current backend (${syncCapability.detail})`

  const formatAdminSettingValue = (value: string | number | boolean | null): string => {
    if (value === null) {
      return 'null'
    }

    return typeof value === 'string' ? value : String(value)
  }

  return (
    <View style={styles.screen}>
      <SectionHeader
        subtitle="Feature flags and bootstrap configuration overview."
        title="Admin Settings"
      />

      <Card
        footer={<Text tone="muted" variant="caption">Settings sync is provider-backed when capability is available.</Text>}
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
          disabled={!canSyncSettings}
          onPress={canSyncSettings ? () => setShowSyncSheet(true) : undefined}
          subtitle={syncActionSubtitle}
          title="Sync settings with backend"
          trailing={
            <Badge
              label={canSyncSettings ? 'ready' : 'unsupported'}
              tone={canSyncSettings ? 'success' : 'neutral'}
            />
          }
        />
      </Card>

      <Card
        headerTrailing={
          <Badge
            label={adminSettingsSource === 'remote' ? 'remote' : 'fallback'}
            tone={adminSettingsSource === 'remote' ? 'success' : 'neutral'}
          />
        }
        subtitle={
          adminSettingsSource === 'remote'
            ? `Remote admin settings (${adminSettingsSourceDetail})`
            : `Fallback admin settings (${adminSettingsSourceDetail})`
        }
        title="Backend Admin Settings"
      >
        {isLoadingAdminSettings ? (
          <SkeletonList bodyLinesPerItem={1} items={4} />
        ) : adminSettingsError && !adminSettingsSnapshot ? (
          <ErrorState
            description={adminSettingsError}
            onRetry={() => {
              void refreshAdminSettings()
            }}
            retryLabel="Retry"
            title="Admin settings unavailable"
          />
        ) : (
          <View style={styles.list}>
            <ListItem
              disabled={isRefreshingAdminSettings}
              onPress={() => {
                void refreshAdminSettings()
                toast('Refreshing admin settings snapshot', 'info')
              }}
              showDivider={Boolean(adminSettingsSnapshot && adminSettingsSnapshot.items.length > 0)}
              subtitle={adminCapability.getSettingsDetail}
              title="Refresh backend settings snapshot"
              trailing={
                <Badge
                  label={adminCapability.canGetSettingsRemote ? 'ready' : 'fallback'}
                  tone={adminCapability.canGetSettingsRemote ? 'success' : 'warning'}
                />
              }
            />

            {!adminSettingsSnapshot || adminSettingsSnapshot.items.length === 0 ? (
              <Text tone="muted" variant="caption">
                No backend admin settings were returned by the provider. Local fallback is shown only
                when available.
              </Text>
            ) : (
              adminSettingsSnapshot.items.map((item, index) => (
                <ListItem
                  key={item.key}
                  showDivider={index < adminSettingsSnapshot.items.length - 1}
                  subtitle={formatAdminSettingValue(item.value)}
                  title={item.label}
                  trailing={
                    item.group ? (
                      <Badge
                        label={item.group}
                        tone={item.group === 'features' ? 'brand' : 'neutral'}
                      />
                    ) : undefined
                  }
                />
              ))
            )}

            {adminSettingsSnapshot?.updatedAt ? (
              <Text tone="muted" variant="caption">
                Snapshot updated at {adminSettingsSnapshot.updatedAt}
              </Text>
            ) : null}
          </View>
        )}
      </Card>

      <BackendDiagnosticsCard />

      <BottomSheet
        footer={
          <View style={styles.sheetFooterButtons}>
            <Button
              label="Validate sync"
              disabled={!canSyncSettings}
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
            Provider contract: {syncCapability.canExecute ? 'ready' : 'not executable'} ({syncCapability.detail})
          </Text>
          <Text tone="muted" variant="caption">
            Payload schema: `pmnative.settings.sync/1`
          </Text>
        </View>
      </BottomSheet>

      <LoadingOverlay label="Refreshing admin settings..." visible={isRefreshingAdminSettings} />
    </View>
  )
}
