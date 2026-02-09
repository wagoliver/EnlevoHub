#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

console.log('🚀 Starting EnlevoHub...\n')

// Check if .env exists, if not copy from .env.example
const envPath = path.join(__dirname, '..', '.env')
const envExamplePath = path.join(__dirname, '..', '.env.example')

if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  console.log('📝 Creating .env file from .env.example...')
  fs.copyFileSync(envExamplePath, envPath)
  console.log('✅ .env file created. Please review and update the configuration.\n')
}

// Start the daemon
const daemonPath = path.join(__dirname, '..', 'packages', 'daemon', 'dist', 'index.js')

// Check if daemon is built
if (!fs.existsSync(daemonPath)) {
  console.log('⚠️  Daemon not built. Building now...')
  const buildProc = spawn('npm', ['run', 'build'], {
    cwd: path.join(__dirname, '..'),
    shell: true,
    stdio: 'inherit'
  })

  buildProc.on('close', (code) => {
    if (code === 0) {
      startDaemon()
    } else {
      console.error('❌ Build failed')
      process.exit(1)
    }
  })
} else {
  startDaemon()
}

function startDaemon() {
  const daemon = spawn('node', [daemonPath], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    detached: false
  })

  daemon.on('error', (error) => {
    console.error('❌ Failed to start daemon:', error)
    process.exit(1)
  })

  daemon.on('exit', (code, signal) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Daemon exited with code ${code}`)
      process.exit(code)
    }
  })

  // Handle parent process termination
  process.on('SIGINT', () => {
    daemon.kill('SIGINT')
  })

  process.on('SIGTERM', () => {
    daemon.kill('SIGTERM')
  })
}
