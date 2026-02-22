import { StyleSheet, View } from 'react-native'

import { useTheme } from '@/hooks/useTheme'

type DividerOrientation = 'horizontal' | 'vertical'

interface DividerProps {
  orientation?: DividerOrientation
  inset?: number
}

export function Divider({ orientation = 'horizontal', inset = 0 }: DividerProps) {
  const { colors } = useTheme()

  const styles = StyleSheet.create({
    horizontal: {
      borderBottomColor: colors.border,
      borderBottomWidth: 1,
      marginHorizontal: inset,
      width: '100%'
    },
    vertical: {
      alignSelf: 'stretch',
      borderRightColor: colors.border,
      borderRightWidth: 1,
      marginVertical: inset
    }
  })

  return <View style={orientation === 'horizontal' ? styles.horizontal : styles.vertical} />
}
