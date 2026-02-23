import { useEffect, useRef, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'

import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
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
  const { requestPasswordReset, user } = useAuth()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
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
    }
  })

  const email = user?.email?.trim() ?? ''
  const canRequestReset = Boolean(config.features.forgotPassword && email && !submitting)

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
      setSubmitting(true)
      await requestPasswordReset({ email })
      toast('Password reset link sent to your account email.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to send reset link', 'error')
    } finally {
      if (isMountedRef.current) {
        setSubmitting(false)
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

      <Card title="Reset Link">
        <View style={styles.cardContent}>
          <Text tone="secondary">
            We will email a password reset link to the address below.
          </Text>
          <Text variant="label">{email || 'No email available'}</Text>
          <Button
            disabled={!canRequestReset}
            label={submitting ? 'Sending...' : 'Send reset link'}
            onPress={() => {
              void sendResetLink()
            }}
          />
          {!config.features.forgotPassword ? (
            <Text tone="muted" variant="caption">
              Password reset is disabled in the current PMNative feature config.
            </Text>
          ) : null}
        </View>
      </Card>
    </KeyboardAvoidingView>
  )
}
