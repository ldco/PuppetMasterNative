import { useMemo, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'

import { Avatar } from '@/components/atoms/Avatar'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Divider } from '@/components/atoms/Divider'
import { Icon } from '@/components/atoms/Icon'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { EmptyState } from '@/components/molecules/EmptyState'
import { ErrorState } from '@/components/molecules/ErrorState'
import { ListItem } from '@/components/molecules/ListItem'
import { SearchBar } from '@/components/molecules/SearchBar'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { SkeletonList } from '@/components/molecules/SkeletonList'
import { LoadingOverlay } from '@/components/organisms/LoadingOverlay'
import { useAdminUsers } from '@/hooks/useAdmin'
import { useConfirm } from '@/hooks/useConfirm'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

export default function AdminUsersScreen() {
  const router = useRouter()
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const {
    activeUser,
    capability,
    isLoadingUsers: loadingUsers,
    isRefreshingUsers,
    refreshUsers,
    users,
    usersError,
    userMutations,
    usersSource,
    usersSourceDetail,
    updateUserLock,
    updateUserStatus,
    clearUserMutationError
  } = useAdminUsers()
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
    },
    userRow: {
      gap: tokens.spacing.xs
    },
    rowActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm
    },
    rowMeta: {
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
              <View key={entry.id} style={styles.userRow}>
                <ListItem
                  disabled={!capability.canGetUserRemote}
                  leading={<Avatar name={entry.name} size="sm" />}
                  onPress={
                    capability.canGetUserRemote
                      ? () => {
                          router.push(`/(admin)/users/${encodeURIComponent(entry.id)}`)
                        }
                      : undefined
                  }
                  subtitle={`${entry.email}${typeof entry.locked === 'boolean' ? ` • ${entry.locked ? 'locked' : 'unlocked'}` : ''}${typeof entry.disabled === 'boolean' ? ` • ${entry.disabled ? 'disabled' : 'active'}` : ''}`}
                  title={entry.name}
                  trailing={
                    <View style={styles.trailingRow}>
                      <Badge
                        label={entry.role}
                        tone={entry.role === 'master' || entry.role === 'admin' ? 'brand' : 'neutral'}
                      />
                      {typeof entry.disabled === 'boolean' ? (
                        <Badge
                          label={entry.disabled ? 'disabled' : 'active'}
                          tone={entry.disabled ? 'warning' : 'success'}
                        />
                      ) : null}
                      {typeof entry.locked === 'boolean' ? (
                        <Badge
                          label={entry.locked ? 'locked' : 'open'}
                          tone={entry.locked ? 'error' : 'neutral'}
                        />
                      ) : null}
                      {capability.canGetUserRemote ? (
                        <Icon name="chevron-forward" size={16} tone="secondary" />
                      ) : null}
                    </View>
                  }
                />
                {(capability.canUpdateUserStatusRemote || capability.canUpdateUserLockRemote) ? (
                  <View style={styles.rowMeta}>
                    <View style={styles.rowActions}>
                      <Button
                        disabled={
                          !capability.canUpdateUserStatusRemote ||
                          isRefreshingUsers ||
                          loadingUsers ||
                          entry.id === activeUser?.id ||
                          userMutations[entry.id]?.isUpdatingStatus ||
                          userMutations[entry.id]?.isUpdatingLock ||
                          entry.disabled === false
                        }
                        label="Enable"
                        onPress={() => {
                          clearUserMutationError(entry.id)
                          void updateUserStatus(entry.id, false)
                            .then(() => {
                              toast('User enabled', 'success')
                            })
                            .catch(() => {
                              // Hook state already stores row error.
                            })
                        }}
                        size="sm"
                        variant="outline"
                      />
                      <Button
                        disabled={
                          !capability.canUpdateUserStatusRemote ||
                          isRefreshingUsers ||
                          loadingUsers ||
                          entry.id === activeUser?.id ||
                          userMutations[entry.id]?.isUpdatingStatus ||
                          userMutations[entry.id]?.isUpdatingLock ||
                          entry.disabled === true
                        }
                        label="Disable"
                        onPress={() => {
                          void (async () => {
                            const confirmed = await confirm({
                              title: 'Disable user?',
                              message: `Disable ${entry.name} (${entry.email}) until re-enabled.`,
                              confirmLabel: 'Disable',
                              cancelLabel: 'Cancel',
                              tone: 'destructive'
                            })

                            if (!confirmed) {
                              return
                            }

                            clearUserMutationError(entry.id)
                            await updateUserStatus(entry.id, true)
                              .then(() => {
                                toast('User disabled', 'warning')
                              })
                              .catch(() => {
                                // Hook state already stores row error.
                              })
                          })()
                        }}
                        size="sm"
                        variant="outline"
                      />
                      <Button
                        disabled={
                          !capability.canUpdateUserLockRemote ||
                          isRefreshingUsers ||
                          loadingUsers ||
                          entry.id === activeUser?.id ||
                          userMutations[entry.id]?.isUpdatingStatus ||
                          userMutations[entry.id]?.isUpdatingLock ||
                          entry.locked === false
                        }
                        label="Unlock"
                        onPress={() => {
                          clearUserMutationError(entry.id)
                          void updateUserLock(entry.id, false)
                            .then(() => {
                              toast('User unlocked', 'success')
                            })
                            .catch(() => {
                              // Hook state already stores row error.
                            })
                        }}
                        size="sm"
                        variant="outline"
                      />
                      <Button
                        disabled={
                          !capability.canUpdateUserLockRemote ||
                          isRefreshingUsers ||
                          loadingUsers ||
                          entry.id === activeUser?.id ||
                          userMutations[entry.id]?.isUpdatingStatus ||
                          userMutations[entry.id]?.isUpdatingLock ||
                          entry.locked === true
                        }
                        label="Lock"
                        onPress={() => {
                          void (async () => {
                            const confirmed = await confirm({
                              title: 'Lock user?',
                              message: `Lock ${entry.name} (${entry.email}) now.`,
                              confirmLabel: 'Lock',
                              cancelLabel: 'Cancel',
                              tone: 'destructive'
                            })

                            if (!confirmed) {
                              return
                            }

                            clearUserMutationError(entry.id)
                            await updateUserLock(entry.id, true)
                              .then(() => {
                                toast('User locked', 'warning')
                              })
                              .catch(() => {
                                // Hook state already stores row error.
                              })
                          })()
                        }}
                        size="sm"
                        variant="outline"
                      />
                    </View>
                    {userMutations[entry.id]?.error ? (
                      <Text tone="error" variant="caption">
                        {userMutations[entry.id]?.error}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
                {index < filteredUsers.length - 1 ? <Divider inset={0} /> : null}
              </View>
            ))}
          </View>
        )}
      </Card>
      <LoadingOverlay
        label={
          Object.values(userMutations).some((state) => state?.isUpdatingStatus || state?.isUpdatingLock)
            ? 'Updating users...'
            : 'Refreshing users...'
        }
        visible={
          isRefreshingUsers ||
          Object.values(userMutations).some((state) => state?.isUpdatingStatus || state?.isUpdatingLock)
        }
      />
    </View>
  )
}
