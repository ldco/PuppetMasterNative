import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native'

import { Button } from '@/components/atoms/Button'
import { Text } from '@/components/atoms/Text'
import { Card } from '@/components/molecules/Card'
import { ScreenHeader } from '@/components/organisms/ScreenHeader'
import { useChatbot } from '@/hooks/useChatbot'
import { useTheme } from '@/hooks/useTheme'
import type { ChatBotFormBlock, ChatBotFormField, ChatBotMessage } from '@/services/chatbot.service'

const toTimeLabel = (isoTimestamp: string): string => {
  const parsed = new Date(isoTimestamp)

  if (Number.isNaN(parsed.getTime())) {
    return '--:--'
  }

  return parsed.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const toKeyboardType = (field: ChatBotFormField): 'default' | 'email-address' | 'numeric' => {
  if (field.kind === 'email') {
    return 'email-address'
  }

  if (field.kind === 'number') {
    return 'numeric'
  }

  return 'default'
}

export default function AssistantTabScreen() {
  const { colors, tokens } = useTheme()
  const {
    composerValue,
    error,
    getFormError,
    getFormFieldValue,
    isSending,
    messages,
    resetConversation,
    runtimeMode,
    sendActionPayload,
    sendComposerMessage,
    setComposerValue,
    setFormFieldValue,
    sourceDetail,
    submitForm,
    usesMockMode
  } = useChatbot()

  const styles = StyleSheet.create({
    screen: {
      backgroundColor: colors.background,
      flex: 1,
      gap: tokens.spacing.md,
      paddingHorizontal: tokens.spacing.lg,
      paddingTop: tokens.spacing.lg,
      paddingBottom: tokens.spacing.sm
    },
    topActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end'
    },
    chatArea: {
      flex: 1
    },
    chatContent: {
      gap: tokens.spacing.sm,
      paddingBottom: tokens.spacing.md
    },
    messageRow: {
      flexDirection: 'row'
    },
    messageRowAssistant: {
      justifyContent: 'flex-start'
    },
    messageRowUser: {
      justifyContent: 'flex-end'
    },
    bubble: {
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      gap: tokens.spacing.xs,
      maxWidth: '90%',
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm
    },
    bubbleAssistant: {
      backgroundColor: colors.surface,
      borderColor: colors.border
    },
    bubbleUser: {
      backgroundColor: colors.interactiveBrand,
      borderColor: colors.interactiveBrand
    },
    blockCard: {
      marginTop: tokens.spacing.xs
    },
    blockTitle: {
      marginBottom: tokens.spacing.xs
    },
    actionWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.xs
    },
    menuItem: {
      borderColor: colors.border,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      gap: tokens.spacing.xs,
      padding: tokens.spacing.sm
    },
    menuList: {
      gap: tokens.spacing.xs
    },
    formWrap: {
      gap: tokens.spacing.sm
    },
    formField: {
      gap: tokens.spacing.xs
    },
    textInput: {
      backgroundColor: colors.backgroundElevated,
      borderColor: colors.border,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      color: colors.textPrimary,
      minHeight: 44,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm
    },
    selectRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: tokens.spacing.xs
    },
    composerCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: tokens.radius.lg,
      borderWidth: 1,
      gap: tokens.spacing.sm,
      padding: tokens.spacing.md
    },
    composerInput: {
      backgroundColor: colors.backgroundElevated,
      borderColor: colors.border,
      borderRadius: tokens.radius.md,
      borderWidth: 1,
      color: colors.textPrimary,
      maxHeight: 140,
      minHeight: 48,
      paddingHorizontal: tokens.spacing.md,
      paddingVertical: tokens.spacing.sm,
      textAlignVertical: 'top'
    },
    composerActions: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between'
    }
  })

  const renderMessageBlocks = (message: ChatBotMessage) => {
    if (message.role !== 'assistant' || !message.uiBlocks || message.uiBlocks.length === 0) {
      return null
    }

    return message.uiBlocks.map((block, blockIndex) => {
      if (block.type === 'quick-replies') {
        return (
          <View key={`${message.id}-quick-${blockIndex}`} style={styles.blockCard}>
            <Card>
              {block.title ? <Text style={styles.blockTitle} variant="label">{block.title}</Text> : null}
              <View style={styles.actionWrap}>
                {block.options.map((option) => (
                  <Button
                    key={`${message.id}-${option.id}`}
                    label={option.label}
                    onPress={() => {
                      void sendActionPayload(option.payload)
                    }}
                    size="sm"
                    variant="outline"
                  />
                ))}
              </View>
            </Card>
          </View>
        )
      }

      if (block.type === 'menu') {
        return (
          <View key={`${message.id}-menu-${blockIndex}`} style={styles.blockCard}>
            <Card>
              <Text style={styles.blockTitle} variant="label">{block.title}</Text>
              {block.description ? <Text tone="secondary" variant="caption">{block.description}</Text> : null}
              <View style={styles.menuList}>
                {block.items.map((item) => (
                  <View key={`${message.id}-${item.id}`} style={styles.menuItem}>
                    <Text variant="label">{item.label}</Text>
                    {item.description ? <Text tone="secondary" variant="caption">{item.description}</Text> : null}
                    <Button
                      label="Select"
                      onPress={() => {
                        void sendActionPayload(item.payload)
                      }}
                      size="sm"
                      variant="outline"
                    />
                  </View>
                ))}
              </View>
            </Card>
          </View>
        )
      }

      return (
        <View key={`${message.id}-form-${block.id}`} style={styles.blockCard}>
          <Card>
            <View style={styles.formWrap}>
              <Text variant="label">{block.title}</Text>
              {block.description ? <Text tone="secondary" variant="caption">{block.description}</Text> : null}
              {block.fields.map((field) => {
                const fieldValue = getFormFieldValue(message.id, block.id, field.name)

                return (
                  <View key={`${message.id}-${block.id}-${field.name}`} style={styles.formField}>
                    <Text variant="caption">
                      {field.label}
                      {field.required ? ' *' : ''}
                    </Text>
                    {field.kind === 'select' ? (
                      <View style={styles.selectRow}>
                        {(field.options ?? []).map((option) => (
                          <Button
                            key={`${message.id}-${block.id}-${field.name}-${option.value}`}
                            label={option.label}
                            onPress={() => {
                              setFormFieldValue(message.id, block.id, field.name, option.value)
                            }}
                            size="sm"
                            variant={fieldValue === option.value ? 'primary' : 'outline'}
                          />
                        ))}
                      </View>
                    ) : (
                      <TextInput
                        autoCapitalize="none"
                        keyboardType={toKeyboardType(field)}
                        onChangeText={(value) => {
                          setFormFieldValue(message.id, block.id, field.name, value)
                        }}
                        placeholder={field.placeholder ?? field.label}
                        placeholderTextColor={colors.textSecondary}
                        style={styles.textInput}
                        value={fieldValue}
                      />
                    )}
                  </View>
                )
              })}
              {getFormError(message.id, block.id) ? (
                <Text tone="error" variant="caption">
                  {getFormError(message.id, block.id)}
                </Text>
              ) : null}
              <Button
                label={block.submitLabel ?? 'Submit'}
                onPress={() => {
                  void submitForm(message.id, block as ChatBotFormBlock)
                }}
                size="sm"
              />
            </View>
          </Card>
        </View>
      )
    })
  }

  const renderMessage = (message: ChatBotMessage) => {
    const isAssistant = message.role === 'assistant'

    return (
      <View key={message.id}>
        <View style={[styles.messageRow, isAssistant ? styles.messageRowAssistant : styles.messageRowUser]}>
          <View style={[styles.bubble, isAssistant ? styles.bubbleAssistant : styles.bubbleUser]}>
            <Text tone={isAssistant ? 'primary' : 'onBrand'}>{message.text}</Text>
            <Text tone={isAssistant ? 'muted' : 'onBrand'} variant="caption">
              {toTimeLabel(message.createdAt)}
            </Text>
          </View>
        </View>
        {renderMessageBlocks(message)}
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 84 : 0}
      style={styles.screen}
    >
      <ScreenHeader
        subtitle={
          usesMockMode
            ? 'Mock mode active (configure proxy path or enable direct mode explicitly).'
            : runtimeMode === 'proxy'
              ? 'Proxy mode active (server-side model key management).'
              : 'Direct model mode active.'
        }
        title="Assistant"
      />

      <View style={styles.topActions}>
        <Button
          label="Reset"
          onPress={resetConversation}
          size="sm"
          variant="outline"
        />
      </View>

      <Card>
        <Text tone="secondary" variant="caption">
          {sourceDetail}
        </Text>
      </Card>

      <View style={styles.chatArea}>
        <ScrollView
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
        </ScrollView>
      </View>

      <View style={styles.composerCard}>
        <TextInput
          editable={!isSending}
          multiline
          onChangeText={setComposerValue}
          onSubmitEditing={() => {
            if (!isSending) {
              void sendComposerMessage()
            }
          }}
          placeholder="Ask anything. Try: 'show menu example' or 'open support form'."
          placeholderTextColor={colors.textSecondary}
          style={styles.composerInput}
          value={composerValue}
        />
        <View style={styles.composerActions}>
          {error ? <Text tone="error" variant="caption">{error}</Text> : <View />}
          <Button
            disabled={isSending || composerValue.trim().length === 0}
            label={isSending ? 'Sending...' : 'Send'}
            onPress={() => {
              void sendComposerMessage()
            }}
            size="sm"
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
