import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function line(status, label, detail = '') {
  const suffix = detail ? ` - ${detail}` : ''
  console.log(`${status} ${label}${suffix}`)
}

function run(command, args) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
}

function commandExists(command) {
  const resolver = process.platform === 'win32' ? 'where' : 'which'
  return run(resolver, [command]).status === 0
}

function parseDotEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {}
  }

  const content = fs.readFileSync(filePath, 'utf8')
  const out = {}

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) {
      continue
    }
    const eqIndex = line.indexOf('=')
    if (eqIndex === -1) {
      continue
    }
    const key = line.slice(0, eqIndex).trim()
    const value = line.slice(eqIndex + 1).trim()
    out[key] = value
  }

  return out
}

function isPlaceholder(value = '') {
  return (
    !value ||
    value.includes('your-project-ref') ||
    value.includes('your-supabase-anon-key') ||
    value.includes('YOUR_PROJECT_REF') ||
    value.includes('YOUR_SUPABASE_ANON_KEY') ||
    value.includes('api.your-domain.com')
  )
}

function findAndroidSdkPath() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), 'Android', 'Sdk'),
    path.join(os.homedir(), 'Android', 'sdk')
  ].filter(Boolean)

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate
    }
  }
  return null
}

console.log('PMNative Local Doctor')
console.log('')

const envFile = path.resolve('.env')
const envValues = parseDotEnv(envFile)
const warnings = []

if (fs.existsSync(envFile)) {
  line('OK', '.env file', envFile)
} else {
  line('!!', '.env file', 'Missing (.env.example is available)')
  warnings.push('Create .env from .env.example')
}

const supabaseUrl = envValues.EXPO_PUBLIC_SUPABASE_URL
const supabaseAnon = envValues.EXPO_PUBLIC_SUPABASE_ANON_KEY
const apiBaseUrl = envValues.EXPO_PUBLIC_API_BASE_URL

if (supabaseUrl && !isPlaceholder(supabaseUrl)) {
  line('OK', 'EXPO_PUBLIC_SUPABASE_URL', supabaseUrl)
} else {
  line('!!', 'EXPO_PUBLIC_SUPABASE_URL', 'Missing or placeholder')
  warnings.push('Set EXPO_PUBLIC_SUPABASE_URL for live Supabase auth testing')
}

if (supabaseAnon && !isPlaceholder(supabaseAnon)) {
  line('OK', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'Set')
} else {
  line('!!', 'EXPO_PUBLIC_SUPABASE_ANON_KEY', 'Missing or placeholder')
  warnings.push('Set EXPO_PUBLIC_SUPABASE_ANON_KEY for live Supabase auth testing')
}

if (apiBaseUrl && !isPlaceholder(apiBaseUrl)) {
  line('OK', 'EXPO_PUBLIC_API_BASE_URL', apiBaseUrl)
} else {
  line('..', 'EXPO_PUBLIC_API_BASE_URL', 'Optional / placeholder (only needed for generic-rest)')
}

const androidSdkPath = findAndroidSdkPath()
if (androidSdkPath) {
  line('OK', 'Android SDK path', androidSdkPath)
} else {
  line('!!', 'Android SDK path', 'Not found (common path: ~/Android/Sdk)')
  warnings.push('Install Android SDK or set ANDROID_HOME/ANDROID_SDK_ROOT if you use npm run android')
}

if (commandExists('adb')) {
  const adbVersion = run(process.platform === 'win32' ? 'adb.exe' : 'adb', ['version'])
  const firstLine = (adbVersion.stdout || '').split(/\r?\n/).find(Boolean) ?? 'adb found'
  line('OK', 'adb', firstLine)
} else {
  line('!!', 'adb', 'Not on PATH (wrapper can still auto-detect common SDK paths)')
  warnings.push('Add Android SDK platform-tools to PATH for direct adb usage and shell tools')
}

const npmPrefixResult = run(npmCommand, ['config', 'get', 'prefix'])
const npmPrefix = npmPrefixResult.status === 0 ? npmPrefixResult.stdout.trim() : null
if (npmPrefix) {
  let writable = false
  try {
    fs.accessSync(npmPrefix, fs.constants.W_OK)
    writable = true
  } catch {
    writable = false
  }
  line(writable ? 'OK' : '!!', 'npm global prefix', `${npmPrefix}${writable ? ' (writable)' : ' (not writable)'}`)
  if (!writable) {
    warnings.push('Use a user-level npm prefix to avoid global install failures (e.g. for @expo/ngrok)')
  }
}

const ngrokInstalled = run(npmCommand, ['ls', '-g', '--depth=0', '@expo/ngrok'])
if (ngrokInstalled.status === 0) {
  line('OK', '@expo/ngrok (global)', 'Installed')
} else {
  line('..', '@expo/ngrok (global)', 'Not installed (only needed for tunnel mode)')
}

console.log('')
if (warnings.length === 0) {
  console.log('No blocking issues detected for common local workflows.')
} else {
  console.log('Warnings:')
  for (const warning of warnings) {
    console.log(`- ${warning}`)
  }
}

console.log('')
console.log('Suggested commands:')
console.log('- npm run phone      # Expo Go over LAN (recommended for phone)')
console.log('- npm run tunnel     # Expo tunnel (requires ngrok and working network)')
console.log('- npm run android    # adb / Android SDK required')
