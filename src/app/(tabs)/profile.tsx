import { StyleSheet, View } from 'react-native'

import { Avatar } from '@/components/atoms/Avatar'
import { Badge } from '@/components/atoms/Badge'
import { Button } from '@/components/atoms/Button'
import { Divider } from '@/components/atoms/Divider'
import { Text } from '@/components/atoms/Text'
import { ErrorState } from '@/components/molecules/ErrorState'
import { FormField } from '@/components/molecules/FormField'
import { SkeletonCard } from '@/components/molecules/SkeletonCard'
import { LoadingOverlay } from '@/components/organisms/LoadingOverlay'
import { ScreenHeader } from '@/components/organisms/ScreenHeader'
import { useProfile } from '@/hooks/useProfile'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

export default function ProfileTabScreen() {
  const { colors, tokens } = useTheme()
  const { toast } = useToast()
  const {
    canSaveRemote,
    error,
    isLoading,
    isRefreshing,
    isSaving,
    nameDraft,
    profile,
    profileProviderDetail,
    refreshProfile,
    saveError,
    saveProfile,
    setNameDraft
  } = useProfile()

  const styles = StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      gap: tokens.spacing.sm,
      padding: tokens.spacing.lg
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.sm,
      marginTop: tokens.spacing.xs
    },
    identity: {
      alignItems: 'center',
      gap: tokens.spacing.sm
    },
    form: {
      gap: tokens.spacing.sm,
      width: '100%'
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
          <View style={styles.identity}>
            <Avatar name={profile.name} size="lg" />
            <Badge
              label={`Role: ${profile.role}`}
              tone={profile.role === 'master' || profile.role === 'admin' ? 'brand' : 'neutral'}
            />
          </View>
          <Divider inset={4} />
          <View style={styles.form}>
            <FormField
              autoCapitalize="words"
              errorText={saveError ?? undefined}
              helperText={
                canSaveRemote
                  ? `Remote update enabled (${profileProviderDetail})`
                  : `Remote update unavailable (${profileProviderDetail})`
              }
              label="Display Name"
              onChangeText={setNameDraft}
              placeholder="Enter display name"
              value={nameDraft}
            />
            <Text tone="secondary">Email: {profile.email}</Text>
          </View>
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
            <Button
              disabled={!canSaveRemote || isSaving || nameDraft.trim() === (profile.name ?? '').trim()}
              label={isSaving ? 'Saving...' : 'Save profile'}
              onPress={() => {
                void saveProfile().then(() => {
                  toast('Profile updated', 'success')
                }).catch(() => {
                  // Errors are reflected in hook state; toast is omitted to avoid duplicate UX.
                })
              }}
              size="sm"
            />
          </View>
        </View>
      )}

      <LoadingOverlay label={isSaving ? 'Saving profile...' : 'Refreshing profile...'} visible={isRefreshing || isSaving} />
    </View>
  )
}
