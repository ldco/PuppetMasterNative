import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Divider } from '@/components/atoms/Divider'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { EmptyState } from '@/components/molecules/EmptyState'
import { ErrorState } from '@/components/molecules/ErrorState'
import { ListItem } from '@/components/molecules/ListItem'
import { SearchBar } from '@/components/molecules/SearchBar'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { SkeletonList } from '@/components/molecules/SkeletonList'
import { LoadingOverlay } from '@/components/organisms/LoadingOverlay'
import { useConfirm } from '@/hooks/useConfirm'
import { useAdminLogs } from '@/hooks/useAdminLogs'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

const LOG_LIMIT = 50

export default function AdminLogsScreen() {
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const {
    capability,
    acknowledge,
    clear,
    clearError,
    clearLogMutationError,
    error,
    hasActiveLogMutation,
    isClearing,
    isLoading,
    isRefreshing,
    logMutations,
    logs,
    resolve,
    refresh,
    retry,
    source,
    sourceDetail
  } = useAdminLogs(LOG_LIMIT)
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filteredLogs = useMemo(() => {
    if (!normalizedQuery) {
      return logs
    }

    return logs.filter((entry) => {
      return (
        entry.message.toLowerCase().includes(normalizedQuery) ||
        entry.level.toLowerCase().includes(normalizedQuery) ||
        (entry.source ?? '').toLowerCase().includes(normalizedQuery) ||
        (entry.timestamp ?? '').toLowerCase().includes(normalizedQuery)
      )
    })
  }, [logs, normalizedQuery])

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
    logRow: {
      gap: tokens.spacing.xs
    },
    rowActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm
    },
    searchRow: {
      marginBottom: tokens.spacing.xs
    },
    trailingRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.xs
    }
  })

  const handleRefresh = (): void => {
    if (!capability.canListLogsRemote) {
      toast(capability.listLogsDetail, 'warning')
      return
    }

    if (isClearing || hasActiveLogMutation) {
      toast('Wait for current log actions to finish before refreshing.', 'warning')
      return
    }

    void refresh()
    toast('Refreshing admin logs', 'info')
  }

  const handleClearLogs = (): void => {
    if (!capability.canClearLogsRemote) {
      toast(capability.clearLogsDetail, 'warning')
      return
    }

    if (hasActiveLogMutation || isRefreshing) {
      toast('Wait for current log actions to finish before clearing logs.', 'warning')
      return
    }

    void (async () => {
      const confirmed = await confirm({
        title: 'Clear remote logs?',
        message:
          'This action is destructive and may remove audit visibility from the current backend.',
        confirmLabel: 'Clear logs',
        cancelLabel: 'Cancel',
        tone: 'destructive'
      })

      if (!confirmed) {
        return
      }

      await clear()
        .then((clearedCount) => {
          toast(
            typeof clearedCount === 'number' ? `Cleared ${clearedCount} logs` : 'Logs cleared',
            'success'
          )
        })
        .catch(() => {
          // Hook state already reflects detailed error.
        })
    })()
  }

  return (
    <View style={styles.screen}>
      <SectionHeader
        actionLabel="Refresh"
        onActionPress={handleRefresh}
        subtitle={
          source === 'remote'
            ? `Remote logs (${sourceDetail})`
            : `Fallback logs (${sourceDetail})`
        }
        title="Admin Logs"
      />

      <Card>
        <ListItem
          disabled={
            !capability.canClearLogsRemote ||
            isLoading ||
            isRefreshing ||
            isClearing ||
            hasActiveLogMutation
          }
          onPress={capability.canClearLogsRemote ? handleClearLogs : undefined}
          showDivider
          subtitle={capability.clearLogsDetail}
          title="Clear remote logs"
          trailing={
            <Badge
              label={!capability.canClearLogsRemote ? 'unsupported' : isClearing ? 'clearing' : 'ready'}
              tone={
                !capability.canClearLogsRemote
                  ? 'neutral'
                  : isClearing
                    ? 'warning'
                    : 'success'
              }
            />
          }
        />
        {clearError ? (
          <ErrorState
            description={clearError}
            onRetry={capability.canClearLogsRemote ? handleClearLogs : undefined}
            retryLabel={capability.canClearLogsRemote ? 'Retry clear' : undefined}
            title="Clear logs failed"
          />
        ) : null}

        <View style={styles.searchRow}>
          <SearchBar onChangeText={setQuery} placeholder="Search logs" value={query} />
        </View>

        {isLoading ? (
          <SkeletonList bodyLinesPerItem={2} items={4} />
        ) : error && logs.length === 0 ? (
          <ErrorState
            description={`${error} Retry after checking your session/provider configuration.`}
            onRetry={handleRefresh}
            retryLabel="Retry refresh"
            title="Logs unavailable"
          />
        ) : filteredLogs.length === 0 ? (
          <EmptyState
            ctaLabel={query ? 'Clear search' : undefined}
            description={
              query ? `No logs matched "${query}".` : 'No logs were returned by the provider.'
            }
            iconName="document-text-outline"
            onCtaPress={query ? () => setQuery('') : undefined}
            title="No logs found"
          />
        ) : (
          <View style={styles.list}>
            {filteredLogs.map((entry, index) => (
              <View key={entry.id} style={styles.logRow}>
                <ListItem
                  subtitle={`${entry.timestamp ?? 'No timestamp'} • ${entry.source ?? 'unknown source'}`}
                  title={entry.message}
                  trailing={
                    <View style={styles.trailingRow}>
                      <Badge
                        label={entry.level}
                        tone={
                          entry.level === 'error'
                            ? 'error'
                            : entry.level === 'warning'
                              ? 'warning'
                              : entry.level === 'audit'
                                ? 'brand'
                                : entry.level === 'info'
                                  ? 'success'
                                  : 'neutral'
                        }
                      />
                      {typeof entry.acknowledged === 'boolean' ? (
                        <Badge
                          label={entry.acknowledged ? 'ack' : 'new'}
                          tone={entry.acknowledged ? 'success' : 'neutral'}
                        />
                      ) : null}
                      {typeof entry.resolved === 'boolean' ? (
                        <Badge
                          label={entry.resolved ? 'resolved' : 'open'}
                          tone={entry.resolved ? 'success' : 'warning'}
                        />
                      ) : null}
                    </View>
                  }
                />
                {capability.canAcknowledgeLogRemote ||
                capability.canResolveLogRemote ||
                capability.canRetryLogRemote ? (
                  <View style={styles.rowActions}>
                    {capability.canAcknowledgeLogRemote ? (
                      <Button
                        disabled={
                          isLoading ||
                          isRefreshing ||
                          isClearing ||
                          logMutations[entry.id]?.isAcknowledging ||
                          logMutations[entry.id]?.isResolving ||
                          logMutations[entry.id]?.isRetrying ||
                          entry.acknowledged === true
                        }
                        label={entry.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                        onPress={() => {
                          clearLogMutationError(entry.id)
                          void acknowledge(entry.id)
                            .then(() => {
                              toast('Log acknowledged', 'success')
                            })
                            .catch(() => {
                              // Hook state already stores row error.
                            })
                        }}
                        size="sm"
                        variant="outline"
                      />
                    ) : null}
                    {capability.canResolveLogRemote ? (
                      <Button
                        disabled={
                          isLoading ||
                          isRefreshing ||
                          isClearing ||
                          logMutations[entry.id]?.isAcknowledging ||
                          logMutations[entry.id]?.isResolving ||
                          logMutations[entry.id]?.isRetrying ||
                          entry.resolved === true
                        }
                        label={entry.resolved ? 'Resolved' : 'Resolve'}
                        onPress={() => {
                          clearLogMutationError(entry.id)
                          void resolve(entry.id)
                            .then(() => {
                              toast('Log resolved', 'success')
                            })
                            .catch(() => {
                              // Hook state already stores row error.
                            })
                        }}
                        size="sm"
                        variant="outline"
                      />
                    ) : null}
                    {capability.canRetryLogRemote ? (
                      <Button
                        disabled={
                          isLoading ||
                          isRefreshing ||
                          isClearing ||
                          logMutations[entry.id]?.isAcknowledging ||
                          logMutations[entry.id]?.isResolving ||
                          logMutations[entry.id]?.isRetrying
                        }
                        label={logMutations[entry.id]?.isRetrying ? 'Retrying...' : 'Retry'}
                        onPress={() => {
                          clearLogMutationError(entry.id)
                          void retry(entry.id)
                            .then(() => {
                              toast('Retry requested', 'success')
                            })
                            .catch(() => {
                              // Hook state already stores row error.
                            })
                        }}
                        size="sm"
                        variant="outline"
                      />
                    ) : null}
                    {logMutations[entry.id]?.error ? (
                      <Text tone="error" variant="caption">
                        {logMutations[entry.id]?.error}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {index < filteredLogs.length - 1 ? <Divider inset={0} /> : null}
              </View>
            ))}
          </View>
        )}
      </Card>

      <LoadingOverlay
        label={
          hasActiveLogMutation
            ? 'Updating logs...'
            : isClearing
              ? 'Clearing logs...'
              : 'Refreshing logs...'
        }
        visible={isRefreshing || isClearing || hasActiveLogMutation}
      />
    </View>
  )
}
