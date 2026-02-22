import { Pressable, StyleSheet, View } from 'react-native'

import { Icon } from '@/components/atoms/Icon'
import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'

interface CheckboxProps {
  label?: string
  checked: boolean
  onToggle: (nextValue: boolean) => void
  indeterminate?: boolean
  disabled?: boolean
}

export function Checkbox({
  label,
  checked,
  onToggle,
  indeterminate = false,
  disabled = false
}: CheckboxProps) {
  const { colors, tokens } = useTheme()

  const styles = StyleSheet.create({
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      minHeight: 44
    },
    box: {
      alignItems: 'center',
      backgroundColor: checked || indeterminate ? colors.interactiveBrand : colors.backgroundElevated,
      borderColor: checked || indeterminate ? colors.interactiveBrand : colors.border,
      borderRadius: tokens.radius.sm,
      borderWidth: 1,
      height: 22,
      justifyContent: 'center',
      width: 22
    },
    disabled: {
      opacity: 0.5
    }
  })

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: indeterminate ? 'mixed' : checked, disabled }}
      disabled={disabled}
      onPress={() => onToggle(indeterminate ? true : !checked)}
      style={[styles.row, disabled ? styles.disabled : undefined]}
    >
      <View style={styles.box}>
        {indeterminate ? (
          <Icon name="remove" size={14} tone="onBrand" />
        ) : checked ? (
          <Icon name="checkmark" size={14} tone="onBrand" />
        ) : null}
      </View>
      {label ? <Text tone="secondary">{label}</Text> : null}
    </Pressable>
  )
}
