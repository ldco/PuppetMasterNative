import { useEffect, useMemo, useRef, useState } from 'react'
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
import { useTheme } from '@/hooks/useTheme'
import { useAuthStore } from '@/stores/auth.store'
import { useToast } from '@/hooks/useToast'
import type { Role } from '@/types/config'

interface AdminUserRow {
  id: string
  name: string
  email: string
  role: Role
}

export default function AdminUsersScreen() {
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const user = useAuthStore((state) => state.user)
  const [query, setQuery] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)
  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const users = useMemo<AdminUserRow[]>(() => {
    if (!user) {
      return []
    }

    return [
      {
        id: user.id,
        name: user.name ?? 'Unknown user',
        email: user.email,
        role: user.role
      }
    ]
  }, [user])

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

  useEffect(() => {
    refreshTimeoutRef.current = setTimeout(() => {
      setLoadingUsers(false)
      refreshTimeoutRef.current = null
    }, 450)

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  const simulateRefresh = (): void => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }

    setLoadingUsers(true)
    toast('Refreshing user directory (placeholder)', 'info')

    refreshTimeoutRef.current = setTimeout(() => {
      setLoadingUsers(false)
      refreshTimeoutRef.current = null
    }, 700)
  }

  if (!user) {
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
        subtitle="Current bootstrap user directory."
        title="Admin Users"
      />

      <Card>
        <View style={styles.searchRow}>
          <SearchBar onChangeText={setQuery} placeholder="Search users" value={query} />
        </View>
        {loadingUsers ? (
          <SkeletonList bodyLinesPerItem={1} items={2} />
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
    </View>
  )
}
