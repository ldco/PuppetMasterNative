import * as Clipboard from 'expo-clipboard'
import { StyleSheet, View } from 'react-native'

import { Badge } from '@/components/atoms/Badge'
import { Card } from '@/components/molecules/Card'
import { ListItem } from '@/components/molecules/ListItem'
import { useBackendDiagnostics } from '@/hooks/useBackendDiagnostics'
import { useTheme } from '@/hooks/useTheme'
import { useToast } from '@/hooks/useToast'

interface BackendDiagnosticsCardProps {
  title?: string
  subtitle?: string
}

const badgeToneByStatus = {
  ok: 'success',
  warning: 'warning',
  error: 'error',
  info: 'neutral'
} as const

export function BackendDiagnosticsCard({
  title = 'Backend Diagnostics',
  subtitle = 'Provider + environment readiness for local setup'
}: BackendDiagnosticsCardProps) {
  const { tokens } = useTheme()
  const { toast } = useToast()
  const backendDiagnostics = useBackendDiagnostics()

  const styles = StyleSheet.create({
    list: {
      gap: tokens.spacing.xs
    }
  })

  const copyDiagnosticValue = async (label: string, value: string): Promise<void> => {
    try {
      await Clipboard.setStringAsync(value)
      toast(`${label} copied`, 'success')
    } catch {
      toast(`Failed to copy ${label.toLowerCase()}`, 'error')
    }
  }

  return (
    <Card subtitle={subtitle} title={title}>
      <View style={styles.list}>
        {backendDiagnostics.items.map((item, index) => {
          const copyValue = item.copyValue

          return (
            <ListItem
              key={item.key}
              onPress={
                copyValue
                  ? () => {
                      void copyDiagnosticValue(item.copyToastLabel ?? item.label, copyValue)
                    }
                  : undefined
              }
              showDivider={index < backendDiagnostics.items.length - 1}
              subtitle={copyValue ? `${item.detail} • Tap to copy` : item.detail}
              title={item.label}
              trailing={<Badge label={item.status} tone={badgeToneByStatus[item.status]} />}
            />
          )
        })}
      </View>
    </Card>
  )
}
