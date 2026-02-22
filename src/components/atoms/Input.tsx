import { StyleSheet, TextInput, View } from 'react-native'

import { useTheme } from '@/hooks/useTheme'
import { Text } from '@/components/atoms/Text'

interface InputProps {
  value: string
  onChangeText: (value: string) => void
  placeholder: string
  label?: string
  helperText?: string
  errorText?: string
  secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
}

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  helperText,
  errorText,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none'
}: InputProps) {
  const { colors, tokens } = useTheme()

  const styles = StyleSheet.create({
    wrapper: {
      gap: tokens.spacing.xs
    },
    field: {
      backgroundColor: colors.backgroundElevated,
      borderColor: errorText ? colors.error : colors.border,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      color: colors.textPrimary,
      minHeight: 44,
      paddingHorizontal: tokens.spacing.md
    }
  })

  return (
    <View style={styles.wrapper}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        secureTextEntry={secureTextEntry}
        style={styles.field}
        value={value}
      />
      {errorText ? <Text variant="caption" tone="error">{errorText}</Text> : null}
      {helperText && !errorText ? <Text variant="caption" tone="muted">{helperText}</Text> : null}
    </View>
  )
}
