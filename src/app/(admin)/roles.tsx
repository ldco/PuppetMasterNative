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
import { useAdmin } from '@/hooks/useAdmin'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

export default function AdminRolesScreen() {
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const {
    activeUser,
    capability,
    roles,
    rolesError,
    rolesSource,
    rolesSourceDetail,
    isLoadingRoles,
    isRefreshingRoles,
    refreshRoles
  } = useAdmin()
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filteredRoles = useMemo(() => {
    if (!normalizedQuery) {
      return roles
    }

    return roles.filter((role) => {
      return (
        role.key.toLowerCase().includes(normalizedQuery) ||
        role.label.toLowerCase().includes(normalizedQuery) ||
        (role.description ?? '').toLowerCase().includes(normalizedQuery)
      )
    })
  }, [normalizedQuery, roles])

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
    if (!capability.canListRolesRemote) {
      toast(capability.listRolesDetail, 'warning')
      return
    }

    void refreshRoles()
    toast('Refreshing roles', 'info')
  }

  if (!activeUser) {
    return (
      <View style={styles.screen}>
        <SectionHeader title="Admin Roles" />
        <ErrorState
          description="No authenticated session is available. Re-login and try again."
          onRetry={() => toast('Reload session from login flow', 'info')}
          retryLabel="Retry"
          title="Session unavailable"
        />
      </View>
    )
  }

  if (!capability.canListRolesRemote) {
    return (
      <View style={styles.screen}>
        <SectionHeader title="Admin Roles" />
        <ErrorState
          description={capability.listRolesDetail}
          title="Role directory unsupported"
        />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <SectionHeader
        actionLabel="Refresh"
        onActionPress={handleRefresh}
        subtitle={
          rolesSource === 'remote'
            ? `Remote roles (${rolesSourceDetail})`
            : `Fallback roles (${rolesSourceDetail})`
        }
        title="Admin Roles"
      />

      <Card>
        <View style={styles.searchRow}>
          <SearchBar onChangeText={setQuery} placeholder="Search roles" value={query} />
        </View>
        {isLoadingRoles ? (
          <SkeletonList bodyLinesPerItem={1} items={3} />
        ) : rolesError && roles.length === 0 ? (
          <ErrorState
            description={`${rolesError} Retry after checking your session/provider configuration.`}
            onRetry={handleRefresh}
            retryLabel="Retry refresh"
            title="Role directory unavailable"
          />
        ) : filteredRoles.length === 0 ? (
          <EmptyState
            ctaLabel={query ? 'Clear search' : undefined}
            description={query ? `No roles matched "${query}".` : 'No roles are available yet.'}
            iconName="shield-outline"
            onCtaPress={query ? () => setQuery('') : undefined}
            title="No roles found"
          />
        ) : (
          <View style={styles.list}>
            {filteredRoles.map((role, index) => (
              <ListItem
                key={role.key}
                showDivider={index < filteredRoles.length - 1}
                subtitle={role.description ?? role.key}
                title={role.label}
                trailing={
                  <Badge
                    label={role.assignable ? 'assignable' : 'protected'}
                    tone={role.assignable ? 'success' : 'warning'}
                  />
                }
              />
            ))}
          </View>
        )}
      </Card>

      <LoadingOverlay label="Refreshing roles..." visible={isRefreshingRoles} />
    </View>
  )
}
