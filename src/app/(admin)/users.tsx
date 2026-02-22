import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Avatar } from '@/components/atoms/Avatar'
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

export default function AdminUsersScreen() {
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const {
    activeUser,
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
    }
  })

  const simulateRefresh = (): void => {
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

  return (
    <View style={styles.screen}>
      <SectionHeader
        actionLabel="Refresh"
        onActionPress={simulateRefresh}
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
                leading={<Avatar name={entry.name} size="sm" />}
                showDivider={index < filteredUsers.length - 1}
                subtitle={entry.email}
                title={entry.name}
                trailing={
                  <Badge
                    label={entry.role}
                    tone={entry.role === 'master' || entry.role === 'admin' ? 'brand' : 'neutral'}
                  />
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
