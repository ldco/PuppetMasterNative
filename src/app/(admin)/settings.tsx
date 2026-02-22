import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/atoms/Badge'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { ListItem } from '@/components/molecules/ListItem'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { useBackendDiagnostics } from '@/hooks/useBackendDiagnostics'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import { useConfig } from '@/hooks/useConfig'

export default function AdminSettingsScreen() {
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const config = useConfig()
  const backendDiagnostics = useBackendDiagnostics()

  const styles = StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg
    },
    list: {
      gap: tokens.spacing.xs
    }
  })

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
          onPress={() => toast('Config sync placeholder executed', 'info')}
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
          {backendDiagnostics.items.map((item, index) => (
            <ListItem
              key={item.key}
              showDivider={index < backendDiagnostics.items.length - 1}
              subtitle={item.detail}
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
          ))}
        </View>
      </Card>
    </View>
  )
}
