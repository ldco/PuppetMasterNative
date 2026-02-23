import { useState } from 'react'
import { StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

import { KeyboardAvoidingView } from '@/components/molecules/KeyboardAvoidingView'
import { LoginForm, type LoginFormValues } from '@/components/organisms/LoginForm'
import { useAuth } from '@/hooks/useAuth'
import { useConfig } from '@/hooks/useConfig'
import type { SocialAuthProvider } from '@/services/auth/provider.types'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

export default function LoginScreen() {
  const router = useRouter()
  const config = useConfig()
  const { colors, tokens } = useTheme()
  const { signIn, signInWithSocial, socialAuthCapabilities } = useAuth()
  const { toast } = useToast()

  const [submitting, setSubmitting] = useState(false)
  const [socialSubmittingProvider, setSocialSubmittingProvider] =
    useState<SocialAuthProvider | null>(null)

  const styles = StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      flex: 1
    },
    screen: {
      flexGrow: 1,
      gap: tokens.spacing.md,
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

  const submitSocial = async (provider: SocialAuthProvider): Promise<void> => {
    if (submitting || socialSubmittingProvider) {
      return
    }

    try {
      setSocialSubmittingProvider(provider)
      const result = await signInWithSocial(provider)

      if (result.kind === 'session') {
        router.replace('/(tabs)')
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Social login failed', 'error')
    } finally {
      setSocialSubmittingProvider(null)
    }
  }

  return (
    <KeyboardAvoidingView contentContainerStyle={styles.screen} style={styles.container}>
      <LoginForm
        canForgotPassword={config.features.forgotPassword}
        canRegister={config.features.registration}
        onPressForgotPassword={() => router.push('/(auth)/forgot-password')}
        onPressRegister={() => router.push('/(auth)/register')}
        onPressSocialAuth={submitSocial}
        onSubmit={submit}
        socialAuthCapabilities={socialAuthCapabilities}
        socialSubmittingProvider={socialSubmittingProvider}
        submitting={submitting}
      />
    </KeyboardAvoidingView>
  )
}
