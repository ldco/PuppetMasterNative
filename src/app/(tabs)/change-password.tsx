import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'

import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { FormField } from '@/components/molecules/FormField'
import { KeyboardAvoidingView } from '@/components/molecules/KeyboardAvoidingView'
import { ScreenHeader } from '@/components/organisms/ScreenHeader'
import { useAuth } from '@/hooks/useAuth'
import { useConfig } from '@/hooks/useConfig'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

export default function ChangePasswordScreen() {
  const router = useRouter()
  const config = useConfig()
  const { colors, tokens } = useTheme()
  const { canUpdatePasswordDirectly, changePassword, requestPasswordReset, user } = useAuth()
  const { toast } = useToast()
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [updateSubmitting, setUpdateSubmitting] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updateError, setUpdateError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flex: 1
    },
    screen: {
      flexGrow: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg
    },
    cardContent: {
      gap: tokens.spacing.sm
    },
    cardStack: {
      gap: tokens.spacing.md
    }
  })

  const email = user?.email?.trim() ?? ''
  const isBusy = resetSubmitting || updateSubmitting
  const passwordsMatch = password === confirmPassword
  const canSubmitPasswordUpdate = Boolean(
    canUpdatePasswordDirectly &&
    !isBusy &&
    password.length >= 8 &&
    confirmPassword.length >= 8 &&
    passwordsMatch
  )
  const canRequestReset = Boolean(config.features.forgotPassword && email && !isBusy)

  const updatePasswordDirectly = async (): Promise<void> => {
    if (!canUpdatePasswordDirectly) {
      toast('Direct password update is not supported by the active provider yet.', 'error')
      return
    }

    if (password.length < 8) {
      setUpdateError('Password must be at least 8 characters.')
      return
    }

    if (!passwordsMatch) {
      setUpdateError('Passwords do not match.')
      return
    }

    try {
      setUpdateError(null)
      setUpdateSubmitting(true)
      await changePassword({ password })
      setPassword('')
      setConfirmPassword('')
      toast('Password updated successfully.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update password'
      setUpdateError(message)
      toast(message, 'error')
    } finally {
      if (isMountedRef.current) {
        setUpdateSubmitting(false)
      }
    }
  }

  const sendResetLink = async (): Promise<void> => {
    if (!config.features.forgotPassword) {
      toast('Password reset is disabled by configuration.', 'error')
      return
    }

    if (!email) {
      toast('No account email is available for this session.', 'error')
      return
    }

    try {
      setResetSubmitting(true)
      await requestPasswordReset({ email })
      toast('Password reset link sent to your account email.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to send reset link', 'error')
    } finally {
      if (isMountedRef.current) {
        setResetSubmitting(false)
      }
    }
  }

  return (
    <KeyboardAvoidingView contentContainerStyle={styles.screen} style={styles.container}>
      <ScreenHeader
        actionA11yLabel="Back to profile"
        actionIcon="chevron-back"
        onActionPress={() => router.back()}
        subtitle="Use your account email to start a secure password reset."
        title="Change Password"
      />

      <View style={styles.cardStack}>
        <Card
          subtitle={
            canUpdatePasswordDirectly
              ? 'Authenticated password update for the current session (provider-backed flow).'
              : 'Direct password update is not available for this provider yet.'
          }
          title="Update Password"
        >
          <View style={styles.cardContent}>
            <FormField
              errorText={updateError ?? undefined}
              helperText={
                canUpdatePasswordDirectly
                  ? 'Use at least 8 characters. Some setups may require recent re-authentication.'
                  : 'Use the reset-link flow below until a direct provider adapter is implemented.'
              }
              label="New Password"
              onChangeText={(value) => {
                setUpdateError(null)
                setPassword(value)
              }}
              placeholder="Enter new password"
              required
              secureTextEntry
              value={password}
            />
            <FormField
              label="Confirm Password"
              onChangeText={(value) => {
                setUpdateError(null)
                setConfirmPassword(value)
              }}
              placeholder="Re-enter new password"
              required
              secureTextEntry
              value={confirmPassword}
            />
            {!passwordsMatch && confirmPassword.length > 0 ? (
              <Text tone="error" variant="caption">
                Passwords do not match.
              </Text>
            ) : null}
            <Button
              disabled={!canSubmitPasswordUpdate}
              label={updateSubmitting ? 'Updating...' : 'Update password'}
              onPress={() => {
                void updatePasswordDirectly()
              }}
            />
          </View>
        </Card>

        <Card title="Reset Link">
          <View style={styles.cardContent}>
            <Text tone="secondary">
              We will email a password reset link to the address below.
            </Text>
            <Text variant="label">{email || 'No email available'}</Text>
            <Button
              disabled={!canRequestReset}
              label={resetSubmitting ? 'Sending...' : 'Send reset link'}
              onPress={() => {
                void sendResetLink()
              }}
              variant="outline"
            />
            {!config.features.forgotPassword ? (
              <Text tone="muted" variant="caption">
                Password reset is disabled in the current PMNative feature config.
              </Text>
            ) : null}
          </View>
        </Card>
      </View>
    </KeyboardAvoidingView>
  )
}
