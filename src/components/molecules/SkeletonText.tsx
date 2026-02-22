import { StyleSheet, View, type DimensionValue } from 'react-native'

import { SkeletonBlock } from '@/components/molecules/SkeletonBlock'
import { useTheme } from '@/hooks/useTheme'

interface SkeletonTextProps {
  lines?: number
  lineHeight?: number
  gap?: number
  animated?: boolean
  widths?: DimensionValue[]
  lastLineWidth?: DimensionValue
}

export function SkeletonText({
  lines = 2,
  lineHeight,
  gap,
  animated = true,
  widths,
  lastLineWidth = '60%'
}: SkeletonTextProps) {
  const { tokens } = useTheme()
  const resolvedLineHeight = lineHeight ?? tokens.typography.body * 0.75
  const resolvedGap = gap ?? tokens.spacing.xs

  const styles = StyleSheet.create({
    root: {
      gap: resolvedGap
    }
  })

  return (
    <View style={styles.root}>
      {Array.from({ length: lines }).map((_, index) => {
        const isLast = index === lines - 1
        const width = widths?.[index] ?? (isLast && lines > 1 ? lastLineWidth : '100%')

        return (
          <SkeletonBlock
            animated={animated}
            height={resolvedLineHeight}
            key={`skeleton-line-${index}`}
            width={width}
          />
        )
      })}
    </View>
  )
}
