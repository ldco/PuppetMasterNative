import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

interface KeyValueStorage {
  set: (key: string, value: string) => void
  getString: (key: string) => string | undefined
  delete: (key: string) => void
}

const storagePrefix = 'pm-native:'
let webStorageInstance: KeyValueStorage | null = null

const createMemoryStorage = (): KeyValueStorage => {
  const map = new Map<string, string>()

  return {
    set: (key, value) => {
      map.set(key, value)
    },
    getString: (key) => map.get(key),
    delete: (key) => {
      map.delete(key)
    }
  }
}

const memoryStorageFallback = createMemoryStorage()

const createWebStorage = (): KeyValueStorage => {
  if (webStorageInstance) {
    return webStorageInstance
  }

  try {
    const localStorageRef =
      typeof globalThis !== 'undefined' && 'localStorage' in globalThis
        ? globalThis.localStorage
        : null

    if (!localStorageRef) {
      webStorageInstance = memoryStorageFallback
      return webStorageInstance
    }

    webStorageInstance = {
      set: (key, value) => {
        localStorageRef.setItem(`${storagePrefix}${key}`, value)
      },
      getString: (key) => localStorageRef.getItem(`${storagePrefix}${key}`) ?? undefined,
      delete: (key) => {
        localStorageRef.removeItem(`${storagePrefix}${key}`)
      }
    }

    return webStorageInstance
  } catch {
    webStorageInstance = memoryStorageFallback
    return webStorageInstance
  }
}

const createNativeStorage = (): KeyValueStorage => {
  try {
    const { MMKV } = require('react-native-mmkv') as { MMKV: new (options?: { id?: string }) => KeyValueStorage }
    return new MMKV({
      id: 'pm-native'
    })
  } catch (error) {
    console.warn(
      '[storageService] MMKV unavailable in this runtime; falling back to in-memory storage.',
      error
    )
    return createMemoryStorage()
  }
}

const appStorage = Platform.OS === 'web' ? createWebStorage() : createNativeStorage()

export const storageService = {
  setItem(key: string, value: string): void {
    appStorage.set(key, value)
  },

  getItem(key: string): string | null {
    return appStorage.getString(key) ?? null
  },

  removeItem(key: string): void {
    appStorage.delete(key)
  },

  async setSecureItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value)
      return
    } catch (error) {
      if (Platform.OS === 'web') {
        createWebStorage().set(`secure:${key}`, value)
        return
      }
      throw error
    }
  },

  async getSecureItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key)
    } catch (error) {
      if (Platform.OS === 'web') {
        return createWebStorage().getString(`secure:${key}`) ?? null
      }
      throw error
    }
  },

  async removeSecureItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key)
      return
    } catch (error) {
      if (Platform.OS === 'web') {
        createWebStorage().delete(`secure:${key}`)
        return
      }
      throw error
    }
  }
}
