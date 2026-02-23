import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'

import { Avatar } from '@/components/atoms/Avatar'
import { Badge } from '@/components/atoms/Badge'
import { Icon } from '@/components/atoms/Icon'
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

export default function AdminUsersScreen() {
  const router = useRouter()
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const {
    activeUser,
    capability,
    isLoadingUsers: loadingUsers,
    isRefreshingUsers,
    refreshUsers,
    users,
    usersError,
    usersSource,
    usersSourceDetail
  } = useAdmin()
  const [query, setQuery] = useState('')

  const normalizedQuery = query.trim().toLowerCase()
  const filteredUsers = useMemo(() => {
    if (!normalizedQuery) {
      return users
    }

    return users.filter((entry) => {
      return (
        entry.name.toLowerCase().includes(normalizedQuery) ||
        entry.email.toLowerCase().includes(normalizedQuery) ||
        entry.role.toLowerCase().includes(normalizedQuery)
      )
    })
  }, [normalizedQuery, users])

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
    },
    trailingRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.xs
    }
  })

  const simulateRefresh = (): void => {
    if (!capability.canListUsersRemote) {
      toast(capability.listUsersDetail, 'warning')
      return
    }

    void refreshUsers()
    toast('Refreshing user directory', 'info')
  }

  if (!activeUser) {
    return (
      <View style={styles.screen}>
        <SectionHeader title="Admin Users" />
        <ErrorState
          description="No authenticated session is available. Re-login and try again."
          onRetry={() => toast('Reload session from login flow', 'info')}
          retryLabel="Retry"
          title="Session unavailable"
        />
      </View>
    )
  }

  if (!capability.canListUsersRemote) {
    return (
      <View style={styles.screen}>
        <SectionHeader title="Admin Users" />
        <ErrorState
          description={capability.listUsersDetail}
          title="User directory unsupported"
        />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <SectionHeader
        actionLabel={capability.canListUsersRemote ? 'Refresh' : undefined}
        onActionPress={capability.canListUsersRemote ? simulateRefresh : undefined}
        subtitle={
          usersSource === 'remote'
            ? `Remote directory (${usersSourceDetail})`
            : `Fallback directory (${usersSourceDetail})`
        }
        title="Admin Users"
      />

      <Card>
        <View style={styles.searchRow}>
          <SearchBar onChangeText={setQuery} placeholder="Search users" value={query} />
        </View>
        {loadingUsers ? (
          <SkeletonList bodyLinesPerItem={1} items={2} />
        ) : usersError && users.length === 0 ? (
          <ErrorState
            description={`${usersError} Retry after checking your session/provider configuration.`}
            onRetry={simulateRefresh}
            retryLabel="Retry refresh"
            title="User directory unavailable"
          />
        ) : filteredUsers.length === 0 ? (
          <EmptyState
            ctaLabel={query ? 'Clear search' : undefined}
            description={query ? `No users matched "${query}".` : 'No users are available yet.'}
            iconName="people-outline"
            onCtaPress={query ? () => setQuery('') : undefined}
            title="No users found"
          />
        ) : (
          <View style={styles.list}>
            {filteredUsers.map((entry, index) => (
              <ListItem
                key={entry.id}
                disabled={!capability.canGetUserRemote}
                leading={<Avatar name={entry.name} size="sm" />}
                onPress={
                  capability.canGetUserRemote
                    ? () => {
                        router.push(`/(admin)/users/${encodeURIComponent(entry.id)}`)
                      }
                    : undefined
                }
                showDivider={index < filteredUsers.length - 1}
                subtitle={entry.email}
                title={entry.name}
                trailing={
                  <View style={styles.trailingRow}>
                    <Badge
                      label={entry.role}
                      tone={entry.role === 'master' || entry.role === 'admin' ? 'brand' : 'neutral'}
                    />
                    {capability.canGetUserRemote ? (
                      <Icon name="chevron-forward" size={16} tone="secondary" />
                    ) : null}
                  </View>
                }
              />
            ))}
          </View>
        )}
      </Card>
      <LoadingOverlay label="Refreshing users..." visible={isRefreshingUsers} />
    </View>
  )
}
