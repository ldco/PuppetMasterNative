import * as SecureStore from 'expo-secure-store'
import { MMKV } from 'react-native-mmkv'

const appStorage = new MMKV({
  id: 'pm-native'
})

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
    await SecureStore.setItemAsync(key, value)
  },

  async getSecureItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key)
  },

  async removeSecureItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key)
  }
}
