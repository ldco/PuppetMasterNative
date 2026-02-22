import * as ExpoLinking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useEffect, useRef } from 'react'
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native'

import { Text } from '@/components/atoms/Text'
import { useAuth } from '@/hooks/useAuth'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'
import type { SocialAuthMode } from '@/services/auth/provider.types'

const getWebLocationHref = (): string | null => {
  if (Platform.OS !== 'web') {
    return null
  }

  const location = (globalThis as { location?: { href?: string } }).location
  return typeof location?.href === 'string' && location.href.length > 0 ? location.href : null
}

const parseCallbackMode = (value: string | null): SocialAuthMode | null => {
  if (value === 'login' || value === 'register') {
    return value
  }

  return null
}

export default function OAuthCallbackScreen() {
  const router = useRouter()
  const linkingUrl = ExpoLinking.useURL()
  const callbackUrl = linkingUrl ?? getWebLocationHref()
  const callbackMode = (() => {
    if (!callbackUrl) {
      return null
    }

    try {
      return parseCallbackMode(new URL(callbackUrl, getWebLocationHref() ?? undefined).searchParams.get('mode'))
    } catch {
      return null
    }
  })()
  const processedUrlRef = useRef<string | null>(null)
  const missingUrlHandledRef = useRef(false)
  const { completeSocialAuthCallback } = useAuth()
  const { colors, tokens } = useTheme()
  const { toast } = useToast()

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      backgroundColor: colors.background,
      flex: 1,
      gap: tokens.spacing.md,
      justifyContent: 'center',
      padding: tokens.spacing.lg
    }
  })

  useEffect(() => {
    if (!callbackUrl) {
      return
    }

    if (processedUrlRef.current === callbackUrl) {
      return
    }

    processedUrlRef.current = callbackUrl
    let cancelled = false

    const complete = async () => {
      try {
        await completeSocialAuthCallback(callbackUrl)

        if (cancelled) {
          return
        }

        toast(
          callbackMode === 'register' ? 'Social registration completed' : 'Social sign-in completed',
          'success'
        )
        router.replace('/(tabs)')
      } catch (error) {
        if (cancelled) {
          return
        }

        toast(error instanceof Error ? error.message : 'Social sign-in failed', 'error')
        router.replace('/(auth)/login')
      }
    }

    void complete()

    return () => {
      cancelled = true
    }
  }, [callbackMode, callbackUrl, completeSocialAuthCallback, router, toast])

  useEffect(() => {
    if (callbackUrl || missingUrlHandledRef.current) {
      return
    }

    const timeout = setTimeout(() => {
      if (missingUrlHandledRef.current || callbackUrl) {
        return
      }

      missingUrlHandledRef.current = true
      toast('Missing social auth callback data. Please try again.', 'error')
      router.replace('/(auth)/login')
    }, 1500)

    return () => {
      clearTimeout(timeout)
    }
  }, [callbackUrl, router, toast])

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text align="center" tone="muted" variant="body">
        Completing social sign-in...
      </Text>
    </View>
  )
}
