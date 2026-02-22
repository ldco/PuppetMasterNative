import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { FormField } from '@/components/molecules/FormField'
import { useTheme } from '@/hooks/useTheme'

export interface LoginFormValues {
  email: string
  password: string
}

interface LoginFormProps {
  submitting?: boolean
  canRegister?: boolean
  canForgotPassword?: boolean
  onSubmit: (values: LoginFormValues) => Promise<void> | void
  onPressRegister?: () => void
  onPressForgotPassword?: () => void
}

export function LoginForm({
  submitting = false,
  canRegister = false,
  canForgotPassword = false,
  onSubmit,
  onPressRegister,
  onPressForgotPassword
}: LoginFormProps) {
  const { tokens } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const styles = StyleSheet.create({
    content: {
      gap: tokens.spacing.md
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

        <Button disabled={submitting} label={submitting ? 'Logging in...' : 'Login'} onPress={submit} />

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
