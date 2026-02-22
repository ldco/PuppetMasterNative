import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useTheme } from '@/hooks/useTheme'

type SpinnerSize = 'small' | 'large'

interface SpinnerProps {
  size?: SpinnerSize
  overlay?: boolean
}

export function Spinner({ size = 'small', overlay = false }: SpinnerProps) {
  const { colors } = useTheme()

  const styles = StyleSheet.create({
    inline: {
      alignItems: 'center',
      justifyContent: 'center'
    },
    overlay: {
      alignItems: 'center',
      backgroundColor: `${colors.background}cc`,
      bottom: 0,
      justifyContent: 'center',
      left: 0,
      position: 'absolute',
      right: 0,
      top: 0
    }
  })

  return (
    <View pointerEvents={overlay ? 'auto' : 'none'} style={overlay ? styles.overlay : styles.inline}>
      <ActivityIndicator color={colors.interactiveBrand} size={size} />
    </View>
  )
}
