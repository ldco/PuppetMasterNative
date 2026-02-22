import type { ReactNode } from 'react'
import { KeyboardAvoidingView as RNKeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native'
import type { StyleProp, ViewStyle } from 'react-native'

interface KeyboardAvoidingViewProps {
  children: ReactNode
  style?: StyleProp<ViewStyle>
  contentContainerStyle?: StyleProp<ViewStyle>
  keyboardVerticalOffset?: number
}

export function KeyboardAvoidingView({
  children,
  style,
  contentContainerStyle,
  keyboardVerticalOffset = 0
}: KeyboardAvoidingViewProps) {
  const styles = StyleSheet.create({
    root: {
      flex: 1
    }
  })

  return (
    <RNKeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={[styles.root, style]}
    >
      <ScrollView
        contentContainerStyle={contentContainerStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </RNKeyboardAvoidingView>
  )
}
