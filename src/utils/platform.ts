import { Dimensions, Platform } from 'react-native'

export type Surface = 'phone' | 'tablet' | 'web' | 'desktop' | 'tv'

export const detectSurface = (): Surface => {
  const { width } = Dimensions.get('window')

  if (Platform.isTV || width >= 1280) {
    return 'tv'
  }

  if (Platform.OS === 'web' && width >= 1024) {
    return 'desktop'
  }

  if (Platform.OS === 'web') {
    return 'web'
  }

  if (width >= 640) {
    return 'tablet'
  }

  return 'phone'
}
