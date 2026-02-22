import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { FormField } from '@/components/molecules/FormField'
import { useTheme } from '@/hooks/useTheme'
import type { SocialAuthProvider } from '@/services/auth/provider.types'

export interface RegisterFormValues {
  name: string
  email: string
  password: string
}

interface RegisterFormProps {
  submitting?: boolean
  socialSubmittingProvider?: SocialAuthProvider | null
  socialAuthCapabilities?: Partial<Record<SocialAuthProvider, boolean>>
  onSubmit: (values: RegisterFormValues) => Promise<void> | void
  onPressSocialAuth?: (provider: SocialAuthProvider) => Promise<void> | void
  onPressBackToLogin?: () => void
}

export function RegisterForm({
  submitting = false,
  socialSubmittingProvider = null,
  socialAuthCapabilities,
  onSubmit,
  onPressSocialAuth,
  onPressBackToLogin
}: RegisterFormProps) {
  const { tokens } = useTheme()
  const [name, setName] = useState('')
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
    link: {
      minHeight: 44,
      justifyContent: 'center'
    }
  })

  const submit = (): void => {
    void onSubmit({ name, email, password })
  }

  return (
    <Card title="Register">
      <View style={styles.content}>
        <FormField
          autoCapitalize="words"
          label="Name"
          onChangeText={setName}
          placeholder="Name"
          required
          value={name}
        />
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
          label={submitting ? 'Creating account...' : 'Create account'}
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

        {onPressBackToLogin ? (
          <Pressable onPress={onPressBackToLogin} style={styles.link}>
            <Text tone="brand" variant="label">
              Back to login
            </Text>
          </Pressable>
        ) : null}
      </View>
    </Card>
  )
}
