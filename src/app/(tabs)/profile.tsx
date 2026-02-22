import { StyleSheet, View } from 'react-native'

import { Avatar } from '@/components/atoms/Avatar'
import { Badge } from '@/components/atoms/Badge'
import { Divider } from '@/components/atoms/Divider'
import { Text } from '@/components/atoms/Text'
import { ScreenHeader } from '@/components/organisms/ScreenHeader'
import { useAuthStore } from '@/stores/auth.store'
import { useTheme } from '@/hooks/useTheme'

export default function ProfileTabScreen() {
  const { colors, tokens } = useTheme()
  const user = useAuthStore((state) => state.user)

  const styles = StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: tokens.spacing.md,
      padding: tokens.spacing.lg
    },
    card: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      gap: tokens.spacing.sm,
      padding: tokens.spacing.lg
    }
  })

  return (
    <View style={styles.screen}>
      <ScreenHeader subtitle="Authenticated session details." title="Profile" />
      <View style={styles.card}>
        <Avatar name={user?.name} size="lg" />
        <Badge
          label={`Role: ${user?.role ?? 'user'}`}
          tone={user?.role === 'master' || user?.role === 'admin' ? 'brand' : 'neutral'}
        />
        <Divider inset={4} />
        <Text tone="secondary">Name: {user?.name ?? 'Guest'}</Text>
        <Text tone="secondary">Email: {user?.email ?? 'No session'}</Text>
      </View>
    </View>
  )
}
