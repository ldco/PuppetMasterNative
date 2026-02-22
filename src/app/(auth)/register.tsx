import { useState } from 'react'
import { StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

import { KeyboardAvoidingView } from '@/components/molecules/KeyboardAvoidingView'
import { RegisterForm, type RegisterFormValues } from '@/components/organisms/RegisterForm'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

export default function RegisterScreen() {
  const router = useRouter()
  const { colors, tokens } = useTheme()
  const { register } = useAuth()
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
    },
  })

  const submit = async (values: RegisterFormValues): Promise<void> => {
    try {
      setSubmitting(true)
      const result = await register(values)

      if (result.kind === 'session') {
        router.replace('/(tabs)')
        return
      }

      toast(`Check ${result.email} for a confirmation link before logging in.`, 'success')
      router.replace('/(auth)/login')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Registration failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <KeyboardAvoidingView contentContainerStyle={styles.screen} style={styles.container}>
      <RegisterForm
        onPressBackToLogin={() => router.push('/(auth)/login')}
        onSubmit={submit}
        submitting={submitting}
      />
    </KeyboardAvoidingView>
  )
}
