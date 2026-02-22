import { Redirect, Slot } from 'expo-router'

import { useConfig } from '@/hooks/useConfig'
import { useAuthStore } from '@/stores/auth.store'
import { hasRoleLevel } from '@/types/config'

export default function AdminLayout() {
  const config = useConfig()
  const token = useAuthStore((state) => state.token)
  const user = useAuthStore((state) => state.user)

  if (!config.hasAdmin) {
    return <Redirect href="/(tabs)" />
  }

  if (!token || !user) {
    return <Redirect href="/(auth)/login" />
  }

  if (!hasRoleLevel(user.role, 'admin')) {
    return <Redirect href="/(tabs)" />
  }

  return <Slot />
}
