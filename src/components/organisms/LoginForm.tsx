import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { FormField } from '@/components/molecules/FormField'
import { useTheme } from '@/hooks/useTheme'
import type { SocialAuthProvider } from '@/services/auth/provider.types'

export interface LoginFormValues {
  email: string
  password: string
}

interface LoginFormProps {
  submitting?: boolean
  socialSubmittingProvider?: SocialAuthProvider | null
  socialAuthCapabilities?: Partial<Record<SocialAuthProvider, boolean>>
  canRegister?: boolean
  canForgotPassword?: boolean
  onSubmit: (values: LoginFormValues) => Promise<void> | void
  onPressSocialAuth?: (provider: SocialAuthProvider) => Promise<void> | void
  onPressRegister?: () => void
  onPressForgotPassword?: () => void
}

export function LoginForm({
  submitting = false,
  socialSubmittingProvider = null,
  socialAuthCapabilities,
  canRegister = false,
  canForgotPassword = false,
  onSubmit,
  onPressSocialAuth,
  onPressRegister,
  onPressForgotPassword
}: LoginFormProps) {
  const { tokens } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const socialProviders = (['google', 'telegram', 'vk'] as const).filter((provider) => {
    return Boolean(socialAuthCapabilities?.[provider])
  })
  const isSocialSubmitting = socialSubmittingProvider !== null
  const socialLabels: Record<SocialAuthProvider, string> = {
    google: 'Continue with Google',
    telegram: 'Continue with Telegram',
    vk: 'Continue with VK'
  }

  const styles = StyleSheet.create({
    content: {
      gap: tokens.spacing.md
    },
    socialBlock: {
      gap: tokens.spacing.sm
    },
    socialButtons: {
      gap: tokens.spacing.sm
    },
    helperRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
    link: {
      minHeight: 44,
      justifyContent: 'center'
    }
  })

  const submit = (): void => {
    void onSubmit({ email, password })
  }

  return (
    <Card title="Login">
      <View style={styles.content}>
        <FormField
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          placeholder="Email"
          required
          value={email}
        />
        <FormField
          label="Password"
          onChangeText={setPassword}
          placeholder="Password"
          required
          secureTextEntry
          value={password}
        />

        <Button
          disabled={submitting || isSocialSubmitting}
          label={submitting ? 'Logging in...' : 'Login'}
          onPress={submit}
        />

        {socialProviders.length > 0 && onPressSocialAuth ? (
          <View style={styles.socialBlock}>
            <Text tone="muted" variant="caption">
              Or continue with
            </Text>
            <View style={styles.socialButtons}>
              {socialProviders.map((provider) => (
                <Button
                  key={provider}
                  disabled={submitting || isSocialSubmitting}
                  label={
                    socialSubmittingProvider === provider
                      ? 'Starting...'
                      : socialLabels[provider]
                  }
                  onPress={() => {
                    void onPressSocialAuth(provider)
                  }}
                  variant="outline"
                />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.helperRow}>
          {canRegister && onPressRegister ? (
            <Pressable onPress={onPressRegister} style={styles.link}>
              <Text tone="brand" variant="label">
                Create account
              </Text>
            </Pressable>
          ) : (
            <Text tone="muted" variant="caption">
              Registration disabled
            </Text>
          )}

          {canForgotPassword && onPressForgotPassword ? (
            <Pressable onPress={onPressForgotPassword} style={styles.link}>
              <Text tone="brand" variant="label">
                Forgot password
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  )
}
