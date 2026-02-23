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
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
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
  const actor = useAuthStore((state) => state.user)
  const {
    capability,
    error,
    isLoading,
    isRefreshing,
    isUpdatingRole,
    refresh,
    roleUpdateError,
    source,
    sourceDetail,
    updateRole,
    user
  } = useAdminUser(userId)

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
            </View>
            <Divider inset={4} />
            <Text tone="secondary">ID: {user.id}</Text>
            <Text tone="secondary">Name: {user.name}</Text>
            <Text tone="secondary">Email: {user.email}</Text>
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
                  disabled={isUpdatingRole}
                  label="Refresh"
                  onPress={() => {
                    void refresh()
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
        label={isUpdatingRole ? 'Updating role...' : 'Refreshing user...'}
        visible={isRefreshing || isUpdatingRole}
      />
    </View>
  )
}
