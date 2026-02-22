import { Pressable, StyleSheet, TextInput, View } from 'react-native'

import { Icon } from '@/components/atoms/Icon'
import { useTheme } from '@/hooks/useTheme'

interface SearchBarProps {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  disabled?: boolean
  onClear?: () => void
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search',
  disabled = false,
  onClear
}: SearchBarProps) {
  const { colors, tokens } = useTheme()

  const styles = StyleSheet.create({
    root: {
      alignItems: 'center',
      backgroundColor: colors.backgroundElevated,
      borderColor: colors.border,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      flexDirection: 'row',
      minHeight: 44,
      paddingHorizontal: tokens.spacing.sm
    },
    field: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: tokens.typography.body,
      minHeight: 44,
      paddingHorizontal: tokens.spacing.sm
    },
    clearButton: {
      alignItems: 'center',
      borderRadius: tokens.radius.pill,
      height: 28,
      justifyContent: 'center',
      width: 28
    }
  })

  const clear = (): void => {
    onChangeText('')
    onClear?.()
  }

  return (
    <View style={styles.root}>
      <Icon name="search-outline" size={18} tone="secondary" />
      <TextInput
        autoCapitalize="none"
        editable={!disabled}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        style={styles.field}
        value={value}
      />
      {value.length > 0 ? (
        <Pressable accessibilityLabel="Clear search" onPress={clear} style={styles.clearButton}>
          <Icon name="close-circle" size={18} tone="secondary" />
        </Pressable>
      ) : null}
    </View>
  )
}
