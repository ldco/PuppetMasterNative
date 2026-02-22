import { Redirect, Stack } from 'expo-router'

import { useConfig } from '@/hooks/useConfig'
import { useAuthStore } from '@/stores/auth.store'

export default function AuthLayout() {
  const config = useConfig()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (!config.hasAuth) {
    return <Redirect href="/(tabs)" />
  }

  if (token && user) {
    return <Redirect href="/(tabs)" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
