import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/atoms/Badge'
import { Card } from '@/components/molecules/Card'
import { EmptyState } from '@/components/molecules/EmptyState'
import { ErrorState } from '@/components/molecules/ErrorState'
import { ListItem } from '@/components/molecules/ListItem'
import { SearchBar } from '@/components/molecules/SearchBar'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { SkeletonList } from '@/components/molecules/SkeletonList'
import { LoadingOverlay } from '@/components/organisms/LoadingOverlay'
import { useAdminLogs } from '@/hooks/useAdminLogs'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

const LOG_LIMIT = 50

export default function AdminLogsScreen() {
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const {
    capability,
    clear,
    clearError,
    error,
    isClearing,
    isLoading,
    isRefreshing,
    logs,
    refresh,
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
    searchRow: {
      marginBottom: tokens.spacing.xs
    }
  })

  const handleRefresh = (): void => {
    if (!capability.canListLogsRemote || isClearing) {
      toast(capability.listLogsDetail, 'warning')
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

    void clear()
      .then((clearedCount) => {
        toast(
          typeof clearedCount === 'number' ? `Cleared ${clearedCount} logs` : 'Logs cleared',
          'success'
        )
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
          disabled={!capability.canClearLogsRemote || isLoading || isRefreshing || isClearing}
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
              <ListItem
                key={entry.id}
                showDivider={index < filteredLogs.length - 1}
                subtitle={`${entry.timestamp ?? 'No timestamp'} • ${entry.source ?? 'unknown source'}`}
                title={entry.message}
                trailing={
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
                }
              />
            ))}
          </View>
        )}
      </Card>

      <LoadingOverlay
        label={isClearing ? 'Clearing logs...' : 'Refreshing logs...'}
        visible={isRefreshing || isClearing}
      />
    </View>
  )
}
