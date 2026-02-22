import { Redirect } from 'expo-router'

import { useConfig } from '@/hooks/useConfig'
import { useAuthStore } from '@/stores/auth.store'

export default function IndexScreen() {
  const config = useConfig()
  const isAuthenticated = useAuthStore((state) => Boolean(state.token && state.user))

  if (config.hasAuth && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  return <Redirect href="/(tabs)" />
}
