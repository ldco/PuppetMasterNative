import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View
} from 'react-native'

import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'

interface BottomSheetProps {
  visible: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  subtitle?: string
  footer?: ReactNode
  dismissOnBackdropPress?: boolean
  closeOnSwipeDown?: boolean
  maxHeightRatio?: number
}

export function BottomSheet({
  visible,
  onClose,
  children,
  title,
  subtitle,
  footer,
  dismissOnBackdropPress = true,
  closeOnSwipeDown = true,
  maxHeightRatio = 0.85
}: BottomSheetProps) {
  const { colors, tokens } = useTheme()
  const { height: windowHeight } = useWindowDimensions()
  const translateY = useRef(new Animated.Value(windowHeight)).current
  const backdropOpacity = useRef(new Animated.Value(0)).current
  const sheetHeightRef = useRef(0)
  const [isMounted, setIsMounted] = useState(visible)

  const getClosedOffset = (): number => {
    return Math.max(sheetHeightRef.current + tokens.spacing.lg, windowHeight)
  }

  const animateOpen = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true
      }),
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true
      })
    ]).start()
  }

  const animateClose = (onComplete?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: getClosedOffset(),
        duration: 180,
        useNativeDriver: true
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true
      })
    ]).start(() => {
      onComplete?.()
    })
  }

  useEffect(() => {
    if (visible) {
      setIsMounted(true)
      translateY.setValue(getClosedOffset())
      backdropOpacity.setValue(0)
      animateOpen()
      return
    }

    if (!isMounted) {
      return
    }

    animateClose(() => {
      setIsMounted(false)
    })
  }, [backdropOpacity, isMounted, translateY, visible, windowHeight])

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        if (!closeOnSwipeDown) {
          return false
        }

        return gestureState.dy > 6 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
      },
      onPanResponderMove: (_, gestureState) => {
        if (!closeOnSwipeDown) {
          return
        }

        translateY.setValue(Math.max(0, gestureState.dy))
        const progress = Math.min(1, Math.max(0, gestureState.dy / Math.max(sheetHeightRef.current, 1)))
        backdropOpacity.setValue(1 - progress * 0.6)
      },
      onPanResponderRelease: (_, gestureState) => {
        if (!closeOnSwipeDown) {
          return
        }

        const shouldClose =
          gestureState.dy > Math.min(120, Math.max(80, sheetHeightRef.current * 0.25)) ||
          gestureState.vy > 1.1

        if (shouldClose) {
          animateClose(() => {
            onClose()
          })
          return
        }

        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 220,
            mass: 0.8
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true
          })
        ]).start()
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 18,
            stiffness: 220,
            mass: 0.8
          }),
          Animated.timing(backdropOpacity, {
            toValue: 1,
            duration: 120,
            useNativeDriver: true
          })
        ]).start()
      },
      onPanResponderTerminationRequest: () => false
    })
  ).current

  if (!isMounted) {
    return null
  }

  const styles = StyleSheet.create({
    root: {
      flex: 1,
      justifyContent: 'flex-end'
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: colors.background
    },
    container: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderTopLeftRadius: tokens.radius.lg,
      borderTopRightRadius: tokens.radius.lg,
      borderWidth: 1,
      borderBottomWidth: 0,
      gap: tokens.spacing.sm,
      maxHeight: windowHeight * maxHeightRatio,
      paddingHorizontal: tokens.spacing.md,
      paddingTop: tokens.spacing.sm,
      paddingBottom: tokens.spacing.lg
    },
    handleWrap: {
      alignItems: 'center',
      paddingBottom: tokens.spacing.xs
    },
    handle: {
      backgroundColor: colors.border,
      borderRadius: tokens.radius.pill,
      height: 4,
      width: 36
    },
    header: {
      gap: 2
    },
    body: {
      gap: tokens.spacing.sm
    },
    footer: {
      marginTop: tokens.spacing.xs
    }
  })

  return (
    <Modal
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable
            onPress={dismissOnBackdropPress ? onClose : undefined}
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        <Animated.View
          onLayout={(event) => {
            sheetHeightRef.current = event.nativeEvent.layout.height
          }}
          style={[styles.container, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          {title || subtitle ? (
            <View style={styles.header}>
              {title ? <Text variant="h3">{title}</Text> : null}
              {subtitle ? (
                <Text tone="secondary" variant="caption">
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.body}>{children}</View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </View>
    </Modal>
  )
}
