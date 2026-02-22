import { StyleSheet, View } from 'react-native'

import { Avatar } from '@/components/atoms/Avatar'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Divider } from '@/components/atoms/Divider'
import { Text } from '@/components/atoms/Text'
import { ErrorState } from '@/components/molecules/ErrorState'
import { SkeletonCard } from '@/components/molecules/SkeletonCard'
import { LoadingOverlay } from '@/components/organisms/LoadingOverlay'
import { ScreenHeader } from '@/components/organisms/ScreenHeader'
import { useProfile } from '@/hooks/useProfile'
import { useTheme } from '@/hooks/useTheme'

export default function ProfileTabScreen() {
  const { colors, tokens } = useTheme()
  const { error, profile, isLoading, isRefreshing, refreshProfile } = useProfile()

  const styles = StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg
    },
    card: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      gap: tokens.spacing.sm,
      padding: tokens.spacing.lg
    },
    actions: {
      marginTop: tokens.spacing.xs
    }
  })

  return (
    <View style={styles.screen}>
      <ScreenHeader subtitle="Authenticated session details." title="Profile" />
      {isLoading ? (
        <>
          <SkeletonCard bodyLines={2} />
          <SkeletonCard bodyLines={1} showHeader={false} />
        </>
      ) : !profile ? (
        <ErrorState
          description={
            error ?? 'No authenticated profile is available. Sign in again and retry.'
          }
          onRetry={() => {
            void refreshProfile()
          }}
          retryLabel="Reload profile"
          title="Profile unavailable"
        />
      ) : (
        <View style={styles.card}>
          <Avatar name={profile.name} size="lg" />
          <Badge
            label={`Role: ${profile.role}`}
            tone={profile.role === 'master' || profile.role === 'admin' ? 'brand' : 'neutral'}
          />
          <Divider inset={4} />
          <Text tone="secondary">Name: {profile.name ?? 'Unnamed user'}</Text>
          <Text tone="secondary">Email: {profile.email}</Text>
          <View style={styles.actions}>
            <Button
              disabled={isRefreshing}
              label="Refresh profile"
              onPress={() => {
                void refreshProfile()
              }}
              size="sm"
              variant="outline"
            />
          </View>
        </View>
      )}

      <LoadingOverlay label="Refreshing profile..." visible={isRefreshing} />
    </View>
  )
}
