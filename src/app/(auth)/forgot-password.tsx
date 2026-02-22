import { useState } from 'react'
import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { FormField } from '@/components/molecules/FormField'
import { KeyboardAvoidingView } from '@/components/molecules/KeyboardAvoidingView'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

export default function ForgotPasswordScreen() {
  const { colors, tokens } = useTheme()
  const { requestPasswordReset } = useAuth()
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flex: 1
    },
    screen: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: tokens.spacing.lg
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: tokens.radius.lg,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg
    }
  })

  const requestReset = async (): Promise<void> => {
    try {
      setSubmitting(true)
      await requestPasswordReset({ email })
      toast('If an account exists for this email, a reset link has been sent.', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to send reset link', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView contentContainerStyle={styles.screen} style={styles.container}>
      <View style={styles.card}>
        <Text variant="h2">Forgot Password</Text>
        <Text tone="secondary">Enter your email and we will send a reset link.</Text>
        <FormField
          autoCapitalize="none"
          label="Email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          required
          value={email}
        />
        <Button
          disabled={submitting}
          label={submitting ? 'Sending...' : 'Send reset link'}
          onPress={() => {
            void requestReset()
          }}
        />
      </View>
    </KeyboardAvoidingView>
  )
}
