import { useState } from 'react'
import { StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

import { KeyboardAvoidingView } from '@/components/molecules/KeyboardAvoidingView'
import { LoginForm, type LoginFormValues } from '@/components/organisms/LoginForm'
import { useAuth } from '@/hooks/useAuth'
import { useConfig } from '@/hooks/useConfig'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

export default function LoginScreen() {
  const router = useRouter()
  const config = useConfig()
  const { colors, tokens } = useTheme()
  const { signIn } = useAuth()
  const { toast } = useToast()

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
    }
  })

  const submit = async (values: LoginFormValues): Promise<void> => {
    try {
      setSubmitting(true)
      await signIn(values)
      router.replace('/(tabs)')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Login failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView contentContainerStyle={styles.screen} style={styles.container}>
      <LoginForm
        canForgotPassword={config.features.forgotPassword}
        canRegister={config.features.registration}
        onPressForgotPassword={() => router.push('/(auth)/forgot-password')}
        onPressRegister={() => router.push('/(auth)/register')}
        onSubmit={submit}
        submitting={submitting}
      />
    </KeyboardAvoidingView>
  )
}
