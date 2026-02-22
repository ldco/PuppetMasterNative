import { useEffect, useState } from 'react'
import { Image, StyleSheet, View } from 'react-native'

import { Text } from '@/components/atoms/Text'
import { useTheme } from '@/hooks/useTheme'

type AvatarSize = 'sm' | 'md' | 'lg'

interface AvatarProps {
  name?: string | null
  imageUrl?: string | null
  size?: AvatarSize
}

const sizeMap: Record<AvatarSize, number> = {
  sm: 32,
  md: 44,
  lg: 64
}

const extractInitials = (name?: string | null): string => {
  if (!name) {
    return '?'
  }

  const parts = name
    .trim()
    .split(' ')
    .filter(Boolean)

  if (parts.length === 0) {
    return '?'
  }

  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

  return initials || '?'
}

export function Avatar({ name, imageUrl, size = 'md' }: AvatarProps) {
  const { colors } = useTheme()
  const [imageFailed, setImageFailed] = useState(false)
  const avatarSize = sizeMap[size]
  const normalizedImageUrl = imageUrl?.trim() ?? ''
  const hasImage = normalizedImageUrl.length > 0

  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])

  const styles = StyleSheet.create({
    root: {
      alignItems: 'center',
      backgroundColor: colors.backgroundElevated,
      borderColor: colors.border,
      borderRadius: avatarSize / 2,
      borderWidth: 1,
      height: avatarSize,
      justifyContent: 'center',
      overflow: 'hidden',
      width: avatarSize
    },
    image: {
      height: avatarSize,
      width: avatarSize
    }
  })

  if (hasImage && !imageFailed) {
    return (
      <View style={styles.root}>
        <Image
          accessibilityLabel={name ? `${name} avatar` : 'User avatar'}
          onError={() => setImageFailed(true)}
          source={{ uri: normalizedImageUrl }}
          style={styles.image}
        />
      </View>
    )
  }

  return (
    <View style={styles.root}>
      <Text tone="secondary" variant="label">
        {extractInitials(name)}
      </Text>
    </View>
  )
}
