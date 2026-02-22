import { StyleSheet, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { ScreenHeader } from '@/components/organisms/ScreenHeader'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

export default function HomeTabScreen() {
  const { colors, tokens } = useTheme()
  const { toast } = useToast()

  const styles = StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg
    },
    text: {
      marginTop: tokens.spacing.xs
    }
  })

  return (
    <View style={styles.screen}>
      <ScreenHeader subtitle="Framework bootstrap shell is running." title="PMNative" />
      <Text style={styles.text} tone="secondary">
        Use this tab to validate shared UI primitives and interaction flows.
      </Text>
      <Button label="Test toast" onPress={() => toast('Home screen ready', 'success')} />
    </View>
  )
}
