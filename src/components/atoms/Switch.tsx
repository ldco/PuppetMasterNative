import { StyleSheet, Switch as RNSwitch, View } from 'react-native'

import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'

interface SwitchProps {
  label?: string
  value: boolean
  onValueChange: (nextValue: boolean) => void
  disabled?: boolean
}

export function Switch({ label, value, onValueChange, disabled = false }: SwitchProps) {
  const { colors } = useTheme()

  const styles = StyleSheet.create({
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      minHeight: 44
    },
    rowWithLabel: {
      justifyContent: 'space-between',
      width: '100%'
    },
    rowNoLabel: {
      justifyContent: 'center'
    }
  })

  return (
    <View style={[styles.row, label ? styles.rowWithLabel : styles.rowNoLabel]}>
      {label ? <Text tone="secondary">{label}</Text> : null}
      <RNSwitch
        disabled={disabled}
        onValueChange={onValueChange}
        thumbColor={value ? colors.textOnBrand : colors.backgroundElevated}
        trackColor={{ false: colors.border, true: colors.interactiveBrand }}
        value={value}
      />
    </View>
  )
}
