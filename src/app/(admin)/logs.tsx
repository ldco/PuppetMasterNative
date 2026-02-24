import { useMemo, useState } from 'react'
import { Linking, StyleSheet, View } from 'react-native'

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
    clearExportError,
    clearExportJobError,
    clearError,
    clearLogMutationError,
    checkExportJob,
    error,
    exportError,
    exportJobError,
    exportLogs,
    hasActiveLogMutation,
    isClearing,
    isCheckingExportJob,
    isExporting,
    isLoading,
    isRefreshing,
    lastExport,
    lastExportJob,
    logMutations,
    logs,
    resolve,
    refresh,
    retry,
    source,
    sourceDetail
  } = useAdminLogs(LOG_LIMIT)
  const [query, setQuery] = useState('')
  const [lastRequestedExportFormat, setLastRequestedExportFormat] = useState<'json' | 'csv'>('json')

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
    cardActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm,
      marginBottom: tokens.spacing.sm
    },
    searchRow: {
      marginBottom: tokens.spacing.xs
    },
    trailingRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.xs
    },
    exportResult: {
      gap: tokens.spacing.sm,
      marginBottom: tokens.spacing.sm
    }
  })

  const handleRefresh = (): void => {
    if (!capability.canListLogsRemote) {
      toast(capability.listLogsDetail, 'warning')
      return
    }

    if (isClearing || isExporting || isCheckingExportJob || hasActiveLogMutation) {
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

    if (hasActiveLogMutation || isRefreshing || isExporting || isCheckingExportJob) {
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

  const handleExportLogs = (format: 'json' | 'csv'): void => {
    if (!capability.canExportLogsRemote) {
      toast(capability.exportLogsDetail, 'warning')
      return
    }

    if (isRefreshing || isClearing || isExporting || isCheckingExportJob || hasActiveLogMutation) {
      toast('Wait for current log actions to finish before exporting logs.', 'warning')
      return
    }

    setLastRequestedExportFormat(format)
    clearExportError()
    void exportLogs(format)
      .then((result) => {
        if (!result) {
          return
        }

        if (result.url) {
          toast(`Export ${format.toUpperCase()} ready`, 'success')
          return
        }

        if (result.jobId) {
          toast(`Export job queued (${result.jobId})`, 'info')
          return
        }

        toast('Export requested', 'success')
      })
      .catch(() => {
        // Hook state already reflects detailed error.
      })
  }

  const handleOpenExportUrl = (): void => {
    const exportUrl = lastExport?.url
    if (!exportUrl) {
      return
    }

    void Linking.openURL(exportUrl).catch(() => {
      toast('Failed to open export URL.', 'error')
    })
  }

  const handleCheckExportJob = (): void => {
    const jobId = lastExport?.jobId ?? lastExportJob?.jobId ?? null
    if (!jobId) {
      toast('No export job to check yet.', 'warning')
      return
    }

    if (capability.canGetLogExportJobRemote !== true) {
      toast(capability.getLogExportJobDetail ?? 'Export job status is not supported.', 'warning')
      return
    }

    if (isRefreshing || isClearing || isExporting || isCheckingExportJob || hasActiveLogMutation) {
      toast('Wait for current log actions to finish before checking export status.', 'warning')
      return
    }

    clearExportJobError()
    void checkExportJob(jobId)
      .then((result) => {
        if (!result) {
          return
        }

        if (result.status === 'ready' && result.url) {
          toast('Export is ready for download', 'success')
          return
        }

        if (result.status === 'error') {
          toast(result.message ?? 'Export job failed', 'error')
          return
        }

        toast(`Export job status: ${result.status}`, 'info')
      })
      .catch(() => {
        // Hook state already reflects detailed error.
      })
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
            isExporting ||
            isCheckingExportJob ||
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

        <ListItem
          disabled={
            !capability.canExportLogsRemote ||
            isLoading ||
            isRefreshing ||
            isClearing ||
            isExporting ||
            isCheckingExportJob ||
            hasActiveLogMutation
          }
          onPress={capability.canExportLogsRemote ? () => handleExportLogs('json') : undefined}
          showDivider
          subtitle={capability.exportLogsDetail}
          title="Export logs (JSON)"
          trailing={
            <Badge
              label={!capability.canExportLogsRemote ? 'unsupported' : isExporting ? 'exporting' : 'ready'}
              tone={
                !capability.canExportLogsRemote
                  ? 'neutral'
                  : isExporting
                    ? 'warning'
                    : 'success'
              }
            />
          }
        />
        <ListItem
          disabled={
            !capability.canExportLogsRemote ||
            isLoading ||
            isRefreshing ||
            isClearing ||
            isExporting ||
            isCheckingExportJob ||
            hasActiveLogMutation
          }
          onPress={capability.canExportLogsRemote ? () => handleExportLogs('csv') : undefined}
          showDivider
          subtitle={capability.exportLogsDetail}
          title="Export logs (CSV)"
          trailing={
            <Badge
              label={!capability.canExportLogsRemote ? 'unsupported' : isExporting ? 'exporting' : 'ready'}
              tone={
                !capability.canExportLogsRemote
                  ? 'neutral'
                  : isExporting
                    ? 'warning'
                    : 'success'
              }
            />
          }
        />
        {exportError ? (
          <ErrorState
            description={exportError}
            onRetry={capability.canExportLogsRemote ? () => handleExportLogs(lastRequestedExportFormat) : undefined}
            retryLabel={capability.canExportLogsRemote ? 'Retry export' : undefined}
            title="Export logs failed"
          />
        ) : null}
        {lastExport?.jobId ? (
          <ListItem
            disabled={
              capability.canGetLogExportJobRemote !== true ||
              isLoading ||
              isRefreshing ||
              isClearing ||
              isExporting ||
              isCheckingExportJob ||
              hasActiveLogMutation
            }
            onPress={capability.canGetLogExportJobRemote === true ? handleCheckExportJob : undefined}
            showDivider
            subtitle={capability.getLogExportJobDetail ?? 'Export job status endpoint unavailable'}
            title="Check export job status"
            trailing={
              <Badge
                label={
                  capability.canGetLogExportJobRemote !== true
                    ? 'unsupported'
                    : isCheckingExportJob
                      ? 'checking'
                      : 'ready'
                }
                tone={
                  capability.canGetLogExportJobRemote !== true
                    ? 'neutral'
                    : isCheckingExportJob
                      ? 'warning'
                      : 'success'
                }
              />
            }
          />
        ) : null}
        {exportJobError ? (
          <ErrorState
            description={exportJobError}
            onRetry={lastExport?.jobId && capability.canGetLogExportJobRemote === true ? handleCheckExportJob : undefined}
            retryLabel={lastExport?.jobId && capability.canGetLogExportJobRemote === true ? 'Retry status check' : undefined}
            title="Export status check failed"
          />
        ) : null}
        {lastExport ? (
          <View style={styles.exportResult}>
            <ListItem
              subtitle={[
                lastExport.format ? `Format: ${lastExport.format.toUpperCase()}` : 'Format: unknown',
                lastExport.jobId ? `Job: ${lastExport.jobId}` : null,
                lastExport.url ? 'Download URL ready' : 'No download URL returned',
                lastExport.sourceDetail
              ]
                .filter(Boolean)
                .join(' • ')}
              title="Last export result"
              trailing={
                <Badge
                  label={lastExport.url ? 'ready' : lastExport.jobId ? 'queued' : 'done'}
                  tone={lastExport.url ? 'success' : lastExport.jobId ? 'warning' : 'neutral'}
                />
              }
            />
            <View style={styles.cardActions}>
              <Button
                disabled={!lastExport.url}
                label="Open export URL"
                onPress={handleOpenExportUrl}
                size="sm"
                variant="outline"
              />
              <Button
                disabled={
                  !lastExport.jobId ||
                  capability.canGetLogExportJobRemote !== true ||
                  isLoading ||
                  isRefreshing ||
                  isClearing ||
                  isExporting ||
                  isCheckingExportJob ||
                  hasActiveLogMutation
                }
                label={isCheckingExportJob ? 'Checking status...' : 'Check status'}
                onPress={handleCheckExportJob}
                size="sm"
                variant="outline"
              />
            </View>
          </View>
        ) : null}
        {lastExportJob ? (
          <View style={styles.exportResult}>
            <ListItem
              subtitle={[
                `Job: ${lastExportJob.jobId}`,
                `Status: ${lastExportJob.status}`,
                lastExportJob.format ? `Format: ${lastExportJob.format.toUpperCase()}` : null,
                lastExportJob.message,
                lastExportJob.sourceDetail
              ]
                .filter(Boolean)
                .join(' • ')}
              title="Export job status"
              trailing={
                <Badge
                  label={lastExportJob.status}
                  tone={
                    lastExportJob.status === 'ready'
                      ? 'success'
                      : lastExportJob.status === 'error'
                        ? 'error'
                        : lastExportJob.status === 'running' || lastExportJob.status === 'queued'
                          ? 'warning'
                          : 'neutral'
                  }
                />
              }
            />
            <View style={styles.cardActions}>
              <Button
                disabled={!lastExportJob.url}
                label="Open job URL"
                onPress={() => {
                  if (!lastExportJob.url) {
                    return
                  }

                  void Linking.openURL(lastExportJob.url).catch(() => {
                    toast('Failed to open export URL.', 'error')
                  })
                }}
                size="sm"
                variant="outline"
              />
            </View>
          </View>
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
                          isExporting ||
                          isCheckingExportJob ||
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
                          isExporting ||
                          isCheckingExportJob ||
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
                          isExporting ||
                          isCheckingExportJob ||
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
            : isExporting
              ? 'Exporting logs...'
              : isCheckingExportJob
                ? 'Checking export status...'
              : isClearing
                ? 'Clearing logs...'
                : 'Refreshing logs...'
        }
        visible={isRefreshing || isClearing || isExporting || isCheckingExportJob || hasActiveLogMutation}
      />
    </View>
  )
}
