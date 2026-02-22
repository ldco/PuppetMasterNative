import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { pmNativeConfig } from '@/pm-native.config'

let supabaseClient: SupabaseClient | null = null

const getRuntimeEnv = (): Record<string, string | undefined> => {
  const runtimeEnv = globalThis as {
    process?: {
      env?: Record<string, string | undefined>
    }
  }

  return runtimeEnv.process?.env ?? {}
}

export const getSupabaseClient = (): SupabaseClient => {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseConfig = pmNativeConfig.backend.supabase

  if (!supabaseConfig) {
    throw new Error('Missing backend.supabase configuration in pm-native.config.ts')
  }

  const env = getRuntimeEnv()
  const url = env[supabaseConfig.urlEnvVar]
  const anonKey = env[supabaseConfig.anonKeyEnvVar]

  if (!url) {
    throw new Error(`Missing Supabase URL env: ${supabaseConfig.urlEnvVar}`)
  }

  if (!anonKey) {
    throw new Error(`Missing Supabase anon key env: ${supabaseConfig.anonKeyEnvVar}`)
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  })

  return supabaseClient
}
