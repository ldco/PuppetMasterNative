import { useState } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { FormField } from '@/components/molecules/FormField'
import { useTheme } from '@/hooks/useTheme'

export interface RegisterFormValues {
  name: string
  email: string
  password: string
}

interface RegisterFormProps {
  submitting?: boolean
  onSubmit: (values: RegisterFormValues) => Promise<void> | void
  onPressBackToLogin?: () => void
}

export function RegisterForm({
  submitting = false,
  onSubmit,
  onPressBackToLogin
}: RegisterFormProps) {
  const { tokens } = useTheme()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const styles = StyleSheet.create({
    content: {
      gap: tokens.spacing.md
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
          disabled={submitting}
          label={submitting ? 'Creating account...' : 'Create account'}
          onPress={submit}
        />

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
