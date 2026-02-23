import Ionicons from '@expo/vector-icons/Ionicons'
import { Redirect, Tabs } from 'expo-router'

import { useConfig } from '@/hooks/useConfig'
import { useTheme } from '@/hooks/useTheme'
import { useAuthStore } from '@/stores/auth.store'
import { hasRoleLevel } from '@/types/config'

export default function TabsLayout() {
  const config = useConfig()
  const { colors } = useTheme()
  const user = useAuthStore((state) => state.user)
  const isAuthenticated = useAuthStore((state) => Boolean(state.token && state.user))

  if (config.hasAuth && !isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  const availableTabs = config.navigation.tabs.filter((tab) => {
    if (!tab.enabled) {
      return false
    }

    if (tab.requireAuth && !isAuthenticated) {
      return false
    }

    if (tab.minRole && !hasRoleLevel(user?.role, tab.minRole)) {
      return false
    }

    return true
  })

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.interactiveBrand,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border
        }
      }}
    >
      {availableTabs.map((tab) => (
        <Tabs.Screen
          key={tab.key}
          name={tab.key === 'home' ? 'index' : tab.key}
          options={{
            tabBarIcon: ({ color, size }) => <Ionicons color={color} name={tab.icon} size={size} />,
            title: tab.title
          }}
        />
      ))}
      <Tabs.Screen
        name="change-password"
        options={{
          href: null
        }}
      />
    </Tabs>
  )
}
