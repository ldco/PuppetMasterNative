import { spawn } from 'node:child_process'

const args = new Set(process.argv.slice(2))
const skipExpoDoctor = args.has('--skip-expo-doctor')
const skipTypecheck = args.has('--skip-typecheck')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

function run(command, commandArgs, label) {
  return new Promise((resolve) => {
    console.log(`\n[pmnative/setup] ${label}`)
    console.log(`[pmnative/setup] > ${command} ${commandArgs.join(' ')}`)

    const child = spawn(command, commandArgs, {
      stdio: 'inherit',
      env: {
        ...process.env
      }
    })

    child.on('exit', (code, signal) => {
      if (signal) {
        console.error(`[pmnative/setup] ${label} interrupted by signal: ${signal}`)
        resolve({ ok: false, code: 1 })
        return
      }
      resolve({ ok: (code ?? 1) === 0, code: code ?? 1 })
    })

    child.on('error', (error) => {
      console.error(`[pmnative/setup] Failed to run ${label}: ${error.message}`)
      resolve({ ok: false, code: 1 })
    })
  })
}

async function main() {
  console.log('[pmnative/setup] Local bootstrap checks')
  console.log('[pmnative/setup] This does not install system SDKs (Android SDK / Xcode).')

  const steps = [
    { label: 'Local doctor', cmd: npmCommand, args: ['run', 'doctor:local'] },
    ...(skipExpoDoctor ? [] : [{ label: 'Expo doctor', cmd: npmCommand, args: ['run', 'doctor:expo'] }]),
    ...(skipTypecheck ? [] : [{ label: 'TypeScript typecheck', cmd: npmCommand, args: ['run', 'typecheck'] }])
  ]

  const failures = []
  for (const step of steps) {
    const result = await run(step.cmd, step.args, step.label)
    if (!result.ok) {
      failures.push(step.label)
    }
  }

  console.log('\n[pmnative/setup] Summary')
  if (failures.length === 0) {
    console.log('[pmnative/setup] All checks passed.')
    console.log('[pmnative/setup] Next: `npm run phone` (Expo Go / LAN) or `npm run web`.')
    process.exit(0)
  }

  console.log(`[pmnative/setup] Failed checks: ${failures.join(', ')}`)
  console.log('[pmnative/setup] Resolve the issues above, then re-run `npm run setup`.')
  process.exit(1)
}

main().catch((error) => {
  console.error(`[pmnative/setup] Unexpected error: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
