import { StyleSheet, View } from 'react-native'

import { SkeletonCard } from '@/components/molecules/SkeletonCard'
import { useTheme } from '@/hooks/useTheme'

interface SkeletonListProps {
  items?: number
  animated?: boolean
  bodyLinesPerItem?: number
}

export function SkeletonList({
  items = 3,
  animated = true,
  bodyLinesPerItem = 2
}: SkeletonListProps) {
  const { tokens } = useTheme()

  const styles = StyleSheet.create({
    root: {
      gap: tokens.spacing.sm
    }
  })

  return (
    <View style={styles.root}>
      {Array.from({ length: items }).map((_, index) => (
        <SkeletonCard
          animated={animated}
          bodyLines={bodyLinesPerItem}
          key={`skeleton-card-${index}`}
        />
      ))}
    </View>
  )
}
