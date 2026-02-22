import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { useEffect, useRef } from 'react'
import { ActivityIndicator, StyleSheet, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { ConfirmDialog } from '@/components/organisms/ConfirmDialog'
import { ToastContainer } from '@/components/organisms/ToastContainer'
import { useAuth } from '@/hooks/useAuth'
import { configureApiAuthHandlers } from '@/services/api'
import '@/i18n'

const queryClient = new QueryClient()
const styles = StyleSheet.create({
  loadingScreen: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center'
  }
})

export default function RootLayout() {
  const { getAccessToken, hydrateSession, isHydrating, refreshAccessToken } = useAuth()
  const hydratedRef = useRef(false)

  useEffect(() => {
    configureApiAuthHandlers({
      getAccessToken,
      refreshAccessToken
    })

    return () => {
      configureApiAuthHandlers({})
    }
  }, [getAccessToken, refreshAccessToken])

  useEffect(() => {
    if (hydratedRef.current) {
      return
    }

    hydratedRef.current = true
    void hydrateSession()
  }, [hydrateSession])

  if (isHydrating) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingScreen}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <Stack screenOptions={{ headerShown: false }} />
        <ConfirmDialog />
        <ToastContainer />
      </QueryClientProvider>
    </SafeAreaProvider>
  )
}
