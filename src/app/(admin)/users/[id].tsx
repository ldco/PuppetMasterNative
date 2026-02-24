import { useMemo } from 'react'
import { StyleSheet, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { Avatar } from '@/components/atoms/Avatar'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Divider } from '@/components/atoms/Divider'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { ErrorState } from '@/components/molecules/ErrorState'
import { SectionHeader } from '@/components/molecules/SectionHeader'
import { SkeletonCard } from '@/components/molecules/SkeletonCard'
import { LoadingOverlay } from '@/components/organisms/LoadingOverlay'
import { useAdminUser } from '@/hooks/useAdminUser'
import { useAdminUserSessions } from '@/hooks/useAdminUserSessions'
import { useConfirm } from '@/hooks/useConfirm'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import { ADMIN_SESSION_REVOKE_REASONS } from '@/services/admin.service'
import { useAuthStore } from '@/stores/auth.store'
import type { Role } from '@/types/config'

const resolveParamString = (value: string | string[] | undefined): string | null => {
  if (typeof value === 'string' && value.length > 0) {
    return value
  }

  if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
    return value[0]
  }

  return null
}

export default function AdminUserDetailScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ id?: string | string[] }>()
  const userId = useMemo(() => resolveParamString(params.id), [params.id])
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const actor = useAuthStore((state) => state.user)
  const {
    capability,
    error,
    isLoading,
    isRefreshing,
    isUpdatingLock,
    isUpdatingRole,
    isUpdatingStatus,
    lockUpdateError,
    refresh,
    roleUpdateError,
    statusUpdateError,
    source,
    sourceDetail,
    updateLock,
    updateRole,
    updateStatus,
    user
  } = useAdminUser(userId)
  const {
    capability: sessionsCapability,
    clearSessionMutationError,
    error: sessionsError,
    isLoading: isLoadingSessions,
    isRefreshing: isRefreshingSessions,
    isRevoking: isRevokingSessions,
    revokingSessionId,
    refresh: refreshSessions,
    revokeAll: revokeAllSessions,
    revokeOne: revokeOneSession,
    revokeError: revokeSessionsError,
    sessionMutationErrors,
    sessions,
    source: sessionsSource,
    sourceDetail: sessionsSourceDetail
  } = useAdminUserSessions(userId)

  const roleOptions: Role[] = ['master', 'admin', 'editor', 'user']

  const styles = StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg
    },
    card: {
      gap: tokens.spacing.sm
    },
    identity: {
      alignItems: 'center',
      gap: tokens.spacing.sm
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm
    },
    roleSection: {
      gap: tokens.spacing.xs
    },
    lockSection: {
      gap: tokens.spacing.xs
    },
    statusSection: {
      gap: tokens.spacing.xs
    },
    sessionsSection: {
      gap: tokens.spacing.xs
    },
    sessionList: {
      gap: tokens.spacing.xs
    },
    sessionRow: {
      borderColor: colors.border,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      gap: tokens.spacing.xs,
      padding: tokens.spacing.sm
    },
    sessionRowMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.xs
    }
  })

  if (!capability.canGetUserRemote) {
    return (
      <View style={styles.screen}>
        <SectionHeader
          actionLabel="Back"
          onActionPress={() => router.back()}
          subtitle={`Fallback detail (${sourceDetail})`}
          title="Admin User Detail"
        />
        <ErrorState
          description={capability.getUserDetail}
          title="User detail unsupported"
        />
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <SectionHeader
        actionLabel="Back"
        onActionPress={() => router.back()}
        subtitle={
          source === 'remote'
            ? `Remote detail (${sourceDetail})`
            : `Fallback detail (${sourceDetail})`
        }
        title="Admin User Detail"
      />

      {isLoading ? (
        <SkeletonCard bodyLines={3} />
      ) : !user ? (
        <ErrorState
          description={
            error ??
            (userId
              ? `User "${userId}" is not available from the active data source.`
              : 'Missing or invalid user id.')
          }
          onRetry={
            capability.canGetUserRemote
              ? () => {
                  void refresh()
                }
              : undefined
          }
          retryLabel={capability.canGetUserRemote ? 'Retry' : undefined}
          title="User unavailable"
        />
      ) : (
        <Card>
          <View style={styles.card}>
            <View style={styles.identity}>
              <Avatar name={user.name} size="lg" />
              <Badge
                label={user.role}
                tone={user.role === 'master' || user.role === 'admin' ? 'brand' : 'neutral'}
              />
              <Badge
                label={
                  typeof user.disabled === 'boolean'
                    ? user.disabled ? 'disabled' : 'active'
                    : 'status unknown'
                }
                tone={
                  typeof user.disabled !== 'boolean'
                    ? 'neutral'
                    : user.disabled
                      ? 'warning'
                      : 'success'
                }
              />
              <Badge
                label={
                  typeof user.locked === 'boolean'
                    ? user.locked ? 'locked' : 'unlocked'
                    : 'lock unknown'
                }
                tone={
                  typeof user.locked !== 'boolean'
                    ? 'neutral'
                    : user.locked
                      ? 'error'
                      : 'success'
                }
              />
            </View>
            <Divider inset={4} />
            <Text tone="secondary">ID: {user.id}</Text>
            <Text tone="secondary">Name: {user.name}</Text>
            <Text tone="secondary">Email: {user.email}</Text>
            {user.lockedUntil ? (
              <Text tone="secondary">Locked until: {user.lockedUntil}</Text>
            ) : null}
            <View style={styles.sessionsSection}>
              <Text variant="label">Sessions</Text>
              {!sessionsCapability.canListUserSessionsRemote ? (
                <Text tone="secondary" variant="caption">
                  {sessionsCapability.listUserSessionsDetail}
                </Text>
              ) : sessionsError ? (
                <Text tone="error" variant="caption">
                  {sessionsError}
                </Text>
              ) : (
                <Text tone="muted" variant="caption">
                  {sessionsSource === 'remote'
                    ? `Remote sessions (${sessionsSourceDetail})`
                    : `Fallback sessions (${sessionsSourceDetail})`}
                </Text>
              )}
              {revokeSessionsError ? (
                <Text tone="error" variant="caption">
                  {revokeSessionsError}
                </Text>
              ) : null}
              <View style={styles.actions}>
                <Button
                  disabled={
                    !sessionsCapability.canListUserSessionsRemote ||
                    isRefreshingSessions ||
                    isRevokingSessions ||
                    Boolean(revokingSessionId) ||
                    isRefreshing ||
                    isUpdatingRole ||
                    isUpdatingStatus ||
                    isUpdatingLock
                  }
                  label="Refresh sessions"
                  onPress={() => {
                    void refreshSessions()
                  }}
                  size="sm"
                  variant="outline"
                />
                <Button
                  disabled={
                    !sessionsCapability.canRevokeUserSessionsRemote ||
                    isRefreshingSessions ||
                    isRevokingSessions ||
                    Boolean(revokingSessionId) ||
                    isRefreshing ||
                    isUpdatingRole ||
                    isUpdatingStatus ||
                    isUpdatingLock ||
                    user.id === actor?.id
                  }
                  label="Force logout"
                  onPress={() => {
                    void (async () => {
                      const confirmed = await confirm({
                        title: 'Force logout user sessions?',
                        message: `Revoke active sessions for ${user.name} (${user.email}).`,
                        confirmLabel: 'Force logout',
                        cancelLabel: 'Cancel',
                        tone: 'destructive'
                      })

                      if (!confirmed) {
                        return
                      }

                      await revokeAllSessions(ADMIN_SESSION_REVOKE_REASONS.FORCE_LOGOUT_ALL)
                        .then((revokedCount) => {
                          toast(
                            typeof revokedCount === 'number'
                              ? `Revoked ${revokedCount} sessions`
                              : 'User sessions revoked',
                            'warning'
                          )
                        })
                        .catch(() => {
                          // Hook state already reflects the error message.
                        })
                    })()
                  }}
                  size="sm"
                  variant="outline"
                />
              </View>
              {isLoadingSessions ? (
                <Text tone="secondary" variant="caption">
                  Loading sessions...
                </Text>
              ) : sessions.length === 0 ? (
                <Text tone="secondary" variant="caption">
                  No sessions returned for this user.
                </Text>
              ) : (
                <View style={styles.sessionList}>
                  {sessions.slice(0, 5).map((session) => (
                    <View key={session.id} style={styles.sessionRow}>
                      <View style={styles.sessionRowMeta}>
                        {typeof session.current === 'boolean' ? (
                          <Badge
                            label={session.current ? 'current' : 'other'}
                            tone={session.current ? 'brand' : 'neutral'}
                          />
                        ) : null}
                        {typeof session.revoked === 'boolean' ? (
                          <Badge
                            label={session.revoked ? 'revoked' : 'active'}
                            tone={session.revoked ? 'warning' : 'success'}
                          />
                        ) : null}
                      </View>
                      <Text tone="secondary" variant="caption">
                        Last seen: {session.lastSeenAt ?? 'unknown'} • Created:{' '}
                        {session.createdAt ?? 'unknown'}
                      </Text>
                      <Text tone="secondary" variant="caption">
                        IP: {session.ipAddress ?? 'unknown'}
                      </Text>
                      <Text tone="secondary" variant="caption">
                        Agent: {session.userAgent ?? 'unknown'}
                      </Text>
                      <Text tone="secondary" variant="caption">
                        Device: {session.deviceLabel ?? 'unknown'} • Platform: {session.platform ?? 'unknown'}
                      </Text>
                      <Text tone="secondary" variant="caption">
                        Expires: {session.expiresAt ?? 'unknown'}
                      </Text>
                      <View style={styles.actions}>
                        <Button
                          disabled={
                            !sessionsCapability.canRevokeUserSessionRemote ||
                            isRefreshingSessions ||
                            isRevokingSessions ||
                            Boolean(revokingSessionId) ||
                            isRefreshing ||
                            isUpdatingRole ||
                            isUpdatingStatus ||
                            isUpdatingLock ||
                            user.id === actor?.id ||
                            session.revoked === true
                          }
                          label={
                            session.revoked
                              ? 'Revoked'
                              : revokingSessionId === session.id
                              ? 'Revoking...'
                              : 'Revoke session'
                          }
                          onPress={() => {
                            void (async () => {
                              clearSessionMutationError(session.id)
                              const confirmed = await confirm({
                                title: 'Revoke session?',
                                message: `Revoke session ${session.id} for ${user.name} (${user.email}).`,
                                confirmLabel: 'Revoke',
                                cancelLabel: 'Cancel',
                                tone: 'destructive'
                              })

                              if (!confirmed) {
                                return
                              }

                              await revokeOneSession(session.id, ADMIN_SESSION_REVOKE_REASONS.FORCE_LOGOUT_ONE)
                                .then((revokedCount) => {
                                  toast(
                                    typeof revokedCount === 'number'
                                      ? `Revoked ${revokedCount} session`
                                      : 'Session revoked',
                                    'warning'
                                  )
                                })
                                .catch(() => {
                                  // Hook state already reflects the error message.
                                })
                            })()
                          }}
                          size="sm"
                          variant="outline"
                        />
                      </View>
                      {sessionMutationErrors[session.id] ? (
                        <Text tone="error" variant="caption">
                          {sessionMutationErrors[session.id]}
                        </Text>
                      ) : null}
                    </View>
                  ))}
                  {sessions.length > 5 ? (
                    <Text tone="muted" variant="caption">
                      Showing 5 of {sessions.length} sessions.
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
            <View style={styles.lockSection}>
              <Text variant="label">Lock Actions</Text>
              {!capability.canUpdateUserLockRemote ? (
                <Text tone="secondary" variant="caption">
                  {capability.updateUserLockDetail}
                </Text>
              ) : lockUpdateError ? (
                <Text tone="error" variant="caption">
                  {lockUpdateError}
                </Text>
              ) : (
                <Text tone="muted" variant="caption">
                  Lock or unlock this user via the provider-backed admin endpoint.
                </Text>
              )}
              <View style={styles.actions}>
                <Button
                  disabled={
                    !capability.canUpdateUserLockRemote ||
                    isRefreshing ||
                    isUpdatingRole ||
                    isUpdatingStatus ||
                    isUpdatingLock ||
                    user.id === actor?.id ||
                    user.locked === false
                  }
                  label="Unlock user"
                  onPress={() => {
                    void updateLock(false)
                      .then(() => {
                        toast('User unlocked', 'success')
                      })
                      .catch(() => {
                        // Hook state already reflects the error message.
                      })
                  }}
                  size="sm"
                  variant="outline"
                />
                <Button
                  disabled={
                    !capability.canUpdateUserLockRemote ||
                    isRefreshing ||
                    isUpdatingRole ||
                    isUpdatingStatus ||
                    isUpdatingLock ||
                    user.id === actor?.id ||
                    user.locked === true
                  }
                  label="Lock user"
                  onPress={() => {
                    void (async () => {
                      const confirmed = await confirm({
                        title: 'Lock user?',
                        message: `Lock ${user.name} (${user.email}) now.`,
                        confirmLabel: 'Lock',
                        cancelLabel: 'Cancel',
                        tone: 'destructive'
                      })

                      if (!confirmed) {
                        return
                      }

                      await updateLock(true)
                        .then(() => {
                          toast('User locked', 'warning')
                        })
                        .catch(() => {
                          // Hook state already reflects the error message.
                        })
                    })()
                  }}
                  size="sm"
                  variant="outline"
                />
              </View>
            </View>
            <View style={styles.statusSection}>
              <Text variant="label">Status Actions</Text>
              {!capability.canUpdateUserStatusRemote ? (
                <Text tone="secondary" variant="caption">
                  {capability.updateUserStatusDetail}
                </Text>
              ) : statusUpdateError ? (
                <Text tone="error" variant="caption">
                  {statusUpdateError}
                </Text>
              ) : (
                <Text tone="muted" variant="caption">
                  Enable or disable this user via the provider-backed admin endpoint.
                </Text>
              )}
              <View style={styles.actions}>
                <Button
                  disabled={
                    !capability.canUpdateUserStatusRemote ||
                    isRefreshing ||
                    isUpdatingRole ||
                    isUpdatingStatus ||
                    isUpdatingLock ||
                    user.id === actor?.id ||
                    user.disabled === false
                  }
                  label="Enable user"
                  onPress={() => {
                    void updateStatus(false)
                      .then(() => {
                        toast('User enabled', 'success')
                      })
                      .catch(() => {
                        // Hook state already reflects the error message.
                      })
                  }}
                  size="sm"
                  variant="outline"
                />
                <Button
                  disabled={
                    !capability.canUpdateUserStatusRemote ||
                    isRefreshing ||
                    isUpdatingRole ||
                    isUpdatingStatus ||
                    isUpdatingLock ||
                    user.id === actor?.id ||
                    user.disabled === true
                  }
                  label="Disable user"
                  onPress={() => {
                    void (async () => {
                      const confirmed = await confirm({
                        title: 'Disable user?',
                        message: `Disable ${user.name} (${user.email}) until re-enabled.`,
                        confirmLabel: 'Disable',
                        cancelLabel: 'Cancel',
                        tone: 'destructive'
                      })

                      if (!confirmed) {
                        return
                      }

                      await updateStatus(true)
                        .then(() => {
                          toast('User disabled', 'warning')
                        })
                        .catch(() => {
                          // Hook state already reflects the error message.
                        })
                    })()
                  }}
                  size="sm"
                  variant="outline"
                />
              </View>
            </View>
            <View style={styles.roleSection}>
              <Text variant="label">Role Actions</Text>
              {!capability.canUpdateUserRoleRemote ? (
                <Text tone="secondary" variant="caption">
                  {capability.updateUserRoleDetail}
                </Text>
              ) : roleUpdateError ? (
                <Text tone="error" variant="caption">
                  {roleUpdateError}
                </Text>
              ) : (
                <Text tone="muted" variant="caption">
                  Assign a role using the provider-backed admin endpoint.
                </Text>
              )}
              <View style={styles.actions}>
                {roleOptions.map((role) => (
                  <Button
                    key={role}
                    disabled={
                      !capability.canUpdateUserRoleRemote ||
                      isRefreshing ||
                      isUpdatingRole ||
                      isUpdatingStatus ||
                      isUpdatingLock ||
                      user.role === role ||
                      user.id === actor?.id ||
                      (role === 'master' && actor?.role !== 'master')
                    }
                    label={`Set ${role}`}
                    onPress={() => {
                      void updateRole(role)
                        .then(() => {
                          toast(`Role updated to ${role}`, 'success')
                        })
                        .catch(() => {
                          // Hook state already reflects the error message.
                        })
                    }}
                    size="sm"
                    variant={user.role === role ? 'primary' : 'outline'}
                  />
                ))}
              </View>
            </View>
            {capability.canGetUserRemote ? (
              <View style={styles.actions}>
                <Button
                  disabled={
                    isUpdatingRole ||
                    isUpdatingStatus ||
                    isUpdatingLock ||
                    isRefreshingSessions ||
                    isRevokingSessions ||
                    Boolean(revokingSessionId)
                  }
                  label="Refresh"
                  onPress={() => {
                    void refresh()
                    void refreshSessions()
                  }}
                  size="sm"
                  variant="outline"
                />
              </View>
            ) : null}
          </View>
        </Card>
      )}

      <LoadingOverlay
        label={
          revokingSessionId
            ? 'Revoking session...'
            : isRevokingSessions
            ? 'Revoking sessions...'
            : isRefreshingSessions
            ? 'Refreshing sessions...'
            : isUpdatingLock
            ? 'Updating lock state...'
            : isUpdatingStatus
            ? 'Updating status...'
            : isUpdatingRole
              ? 'Updating role...'
              : 'Refreshing user...'
        }
        visible={
          isRefreshing ||
          isRefreshingSessions ||
          isRevokingSessions ||
          Boolean(revokingSessionId) ||
          isUpdatingRole ||
          isUpdatingStatus ||
          isUpdatingLock
        }
      />
    </View>
  )
}
