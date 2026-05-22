import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const envPath = resolve(process.cwd(), '.env')

if (existsSync(envPath)) {
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/)

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const separatorIndex = trimmed.indexOf('=')
    if (separatorIndex <= 0) continue

    const key = trimmed.slice(0, separatorIndex).trim()
    let value = trimmed.slice(separatorIndex + 1).trim()

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }

    process.env[key] = value
  }
}

if (!process.env.PORT) {
  throw new Error('PORT is required in .env')
}

const nextBin = resolve(process.cwd(), 'node_modules/next/dist/bin/next')
const next = spawn(process.execPath, [nextBin, 'dev', '--turbopack', '-p', process.env.PORT], {
  env: process.env,
  stdio: 'inherit',
})

next.on('exit', (code) => {
  process.exit(code ?? 0)
})