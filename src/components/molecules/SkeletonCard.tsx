import { StyleSheet, View } from 'react-native'

import { Card } from '@/components/molecules/Card'
import { SkeletonBlock } from '@/components/molecules/SkeletonBlock'
import { SkeletonText } from '@/components/molecules/SkeletonText'
import { useTheme } from '@/hooks/useTheme'

interface SkeletonCardProps {
  animated?: boolean
  showHeader?: boolean
  bodyLines?: number
}

export function SkeletonCard({
  animated = true,
  showHeader = true,
  bodyLines = 2
}: SkeletonCardProps) {
  const { tokens } = useTheme()

  const styles = StyleSheet.create({
    content: {
      gap: tokens.spacing.sm
    },
    header: {
      gap: tokens.spacing.xs
    },
    footerRow: {
      flexDirection: 'row',
      gap: tokens.spacing.sm,
      marginTop: tokens.spacing.xs
    }
  })

  return (
    <Card>
      <View style={styles.content}>
        {showHeader ? (
          <View style={styles.header}>
            <SkeletonBlock animated={animated} height={16} width="45%" />
            <SkeletonBlock animated={animated} height={10} width="70%" />
          </View>
        ) : null}

        <SkeletonText animated={animated} lines={bodyLines} />

        <View style={styles.footerRow}>
          <SkeletonBlock animated={animated} height={14} width="22%" />
          <SkeletonBlock animated={animated} height={14} width="18%" />
        </View>
      </View>
    </Card>
  )
}
