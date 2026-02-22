import { useEffect, useRef, useState } from 'react'
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  type DimensionValue,
  type StyleProp,
  type ViewStyle
} from 'react-native'

import { useTheme } from '@/hooks/useTheme'

let reduceMotionCache: boolean | null = null
let reduceMotionRequest: Promise<boolean> | null = null

const getReduceMotionEnabled = async (): Promise<boolean> => {
  if (reduceMotionCache !== null) {
    return reduceMotionCache
  }

  if (reduceMotionRequest) {
    return reduceMotionRequest
  }

  const query = AccessibilityInfo.isReduceMotionEnabled

  if (typeof query !== 'function') {
    reduceMotionCache = false
    return false
  }

  reduceMotionRequest = query()
    .then((isEnabled) => {
      reduceMotionCache = isEnabled
      return isEnabled
    })
    .catch(() => {
      reduceMotionCache = false
      return false
    })
    .finally(() => {
      reduceMotionRequest = null
    })

  return reduceMotionRequest
}

interface SkeletonBlockProps {
  width?: DimensionValue
  height?: number
  borderRadius?: number
  animated?: boolean
  style?: StyleProp<ViewStyle>
}

export function SkeletonBlock({
  width = '100%',
  height = 12,
  borderRadius,
  animated = true,
  style
}: SkeletonBlockProps) {
  const { colors, tokens } = useTheme()
  const opacity = useRef(new Animated.Value(0.55)).current
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false)

  useEffect(() => {
    let mounted = true

    void getReduceMotionEnabled()
      .then((isEnabled) => {
        if (mounted) {
          setReduceMotionEnabled(isEnabled)
        }
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!animated || reduceMotionEnabled) {
      opacity.setValue(0.75)
      return
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.95,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.45,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true
        })
      ])
    )

    loop.start()

    return () => {
      loop.stop()
    }
  }, [animated, opacity, reduceMotionEnabled])

  const styles = StyleSheet.create({
    block: {
      backgroundColor: colors.border,
      borderRadius: borderRadius ?? tokens.radius.sm,
      height,
      width
    }
  })

  return <Animated.View style={[styles.block, { opacity }, style]} />
}
