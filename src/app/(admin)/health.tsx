import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { ErrorState } from '@/components/molecules/ErrorState'
import { ListItem } from '@/components/molecules/ListItem'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { SkeletonCard } from '@/components/molecules/SkeletonCard'
import { LoadingOverlay } from '@/components/organisms/LoadingOverlay'
import { useAdminHealth } from '@/hooks/useAdminHealth'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

export default function AdminHealthScreen() {
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const { capability, error, health, isLoading, isRefreshing, refresh, source, sourceDetail } = useAdminHealth()

  const styles = StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg
    },
    cardContent: {
      gap: tokens.spacing.xs
    }
  })

  const statusTone =
    health?.status === 'ok'
      ? 'success'
      : health?.status === 'warning'
        ? 'warning'
        : health?.status === 'error'
          ? 'error'
          : 'neutral'

  return (
    <View style={styles.screen}>
      <SectionHeader
        actionLabel="Refresh"
        onActionPress={() => {
          void refresh()
          toast('Refreshing admin health', 'info')
        }}
        subtitle={
          source === 'remote'
            ? `Remote health (${sourceDetail})`
            : `Fallback health (${sourceDetail})`
        }
        title="Admin Health"
      />

      {isLoading ? (
        <SkeletonCard bodyLines={3} />
      ) : !health ? (
        <ErrorState
          description={error ?? 'Health snapshot is unavailable from the active provider.'}
          onRetry={() => {
            void refresh()
          }}
          retryLabel="Retry"
          title="Health unavailable"
        />
      ) : (
        <Card
          headerTrailing={<Badge label={health.status} tone={statusTone} />}
          subtitle={health.checkedAt ? `Checked at ${health.checkedAt}` : undefined}
          title="System Health"
        >
          <View style={styles.cardContent}>
            {health.message ? (
              <Text tone="secondary">{health.message}</Text>
            ) : (
              <Text tone="muted" variant="caption">
                No provider message available.
              </Text>
            )}

            {health.checks.length === 0 ? (
              <Text tone="muted" variant="caption">
                No detailed checks were returned by the provider.
              </Text>
            ) : (
              health.checks.map((check, index) => (
                <ListItem
                  key={check.key}
                  showDivider={index < health.checks.length - 1}
                  subtitle={check.message ?? check.key}
                  title={check.label}
                  trailing={
                    <Badge
                      label={check.status}
                      tone={
                        check.status === 'ok'
                          ? 'success'
                          : check.status === 'warning'
                            ? 'warning'
                            : check.status === 'error'
                              ? 'error'
                              : 'neutral'
                      }
                    />
                  }
                />
              ))
            )}

            {!capability.canGetHealthRemote ? (
              <Button
                disabled
                label="Health endpoint unavailable"
                onPress={() => {}}
                size="sm"
                variant="outline"
              />
            ) : null}
          </View>
        </Card>
      )}

      <LoadingOverlay label="Refreshing health..." visible={isRefreshing} />
    </View>
  )
}
