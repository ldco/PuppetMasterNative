import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const mode = process.argv[2] ?? 'start'
const extraArgs = process.argv.slice(3)
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

const modeArgs = {
  start: [],
  phone: ['--lan'],
  tunnel: ['--tunnel'],
  ios: ['--ios'],
  android: ['--android'],
  web: ['--web']
}

if (!(mode in modeArgs)) {
  console.error(`[pmnative] Unknown mode "${mode}".`)
  console.error('[pmnative] Supported modes: start, phone, tunnel, ios, android, web')
  process.exit(1)
}

function commandExists(command) {
  const resolver = process.platform === 'win32' ? 'where' : 'which'
  const result = spawnSync(resolver, [command], { stdio: 'ignore' })
  return result.status === 0
}

function findAndroidSdkPath() {
  const envCandidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT
  ]
  for (const candidate of envCandidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate
    }
  }

  const home = os.homedir()
  const commonCandidates = [
    path.join(home, 'Android', 'Sdk'),
    path.join(home, 'Android', 'sdk')
  ]

  for (const candidate of commonCandidates) {
    if (fs.existsSync(candidate)) {
      return candidate
    }
  }

  return null
}

function injectAndroidSdkEnv(env, { strict } = { strict: false }) {
  const sdkPath = findAndroidSdkPath()
  if (!sdkPath) {
    if (strict) {
      console.error('[pmnative] Android SDK not found.')
      console.error('[pmnative] Set ANDROID_HOME/ANDROID_SDK_ROOT or install the SDK (common path: ~/Android/Sdk).')
      process.exit(1)
    }
    return false
  }

  const platformTools = path.join(sdkPath, 'platform-tools')
  const emulator = path.join(sdkPath, 'emulator')
  const adbBinary = path.join(platformTools, process.platform === 'win32' ? 'adb.exe' : 'adb')

  if (!fs.existsSync(adbBinary)) {
    if (strict) {
      console.error(`[pmnative] adb was not found in Android SDK path: ${adbBinary}`)
      console.error('[pmnative] Install Android platform-tools in Android SDK Manager.')
      process.exit(1)
    }
    return false
  }

  env.ANDROID_HOME = sdkPath
  env.ANDROID_SDK_ROOT = sdkPath
  env.PATH = [platformTools, emulator, env.PATH].filter(Boolean).join(path.delimiter)

  return true
}

function preflightForTunnel() {
  const npmPrefix = spawnSync(npmCommand, ['config', 'get', 'prefix'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  })
  const prefix = npmPrefix.status === 0 ? npmPrefix.stdout.trim() : ''

  if (prefix === '/usr') {
    console.warn('[pmnative] Warning: npm global prefix is /usr (root-only on most systems).')
    console.warn('[pmnative] If tunnel asks to install @expo/ngrok and fails, set a user prefix first:')
    console.warn('[pmnative]   npm config set prefix "$HOME/.npm-global"')
  }

  const ngrokInstalled = spawnSync(npmCommand, ['ls', '-g', '--depth=0', '@expo/ngrok'], {
    stdio: 'ignore'
  }).status === 0

  if (!ngrokInstalled) {
    console.log('[pmnative] Tunnel mode may require @expo/ngrok (Expo will prompt to install it).')
  }
}

const env = {
  ...process.env,
  EXPO_ROUTER_APP_ROOT: 'src/app'
}

// Best-effort Android SDK injection for all modes so Expo's interactive "a"
// shortcut works even when the parent shell does not export ANDROID_HOME.
const androidEnvInjected = injectAndroidSdkEnv(env, { strict: mode === 'android' })
if (androidEnvInjected && mode === 'android') {
  console.log(`[pmnative] Android preflight ok (SDK: ${env.ANDROID_HOME})`)
}

if (mode === 'tunnel') {
  preflightForTunnel()
}

if (mode === 'android' && !commandExists('adb')) {
  // adb may still work after PATH injection above; re-check against the injected env with a direct spawn.
  const adbCheck = spawnSync(process.platform === 'win32' ? 'adb.exe' : 'adb', ['version'], {
    env,
    stdio: 'ignore'
  })
  if (adbCheck.status !== 0) {
    console.error('[pmnative] adb is not available on PATH after Android preflight.')
    process.exit(1)
  }
}

const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const args = ['expo', 'start', ...modeArgs[mode], ...extraArgs]

console.log(`[pmnative] Running: ${npxCommand} ${args.join(' ')}`)

const child = spawn(npxCommand, args, {
  stdio: 'inherit',
  env
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 0)
})

child.on('error', (error) => {
  console.error(`[pmnative] Failed to start Expo CLI: ${error.message}`)
  process.exit(1)
})
