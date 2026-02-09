#!/usr/bin/env node

const { exec } = require('child_process')
const { promisify } = require('util')

const execAsync = promisify(exec)

async function stopEnlevoHub() {
  console.log('🛑 Stopping EnlevoHub...\n')

  try {
    const platform = process.platform

    if (platform === 'win32') {
      // Windows
      await execAsync('taskkill /F /IM node.exe /FI "WINDOWTITLE eq EnlevoHub*"')
    } else {
      // Linux/Mac
      await execAsync('pkill -f "enlevohub"')
    }

    console.log('✅ EnlevoHub stopped successfully')
  } catch (error) {
    if (error.code === 1) {
      console.log('ℹ️  No EnlevoHub processes found running')
    } else {
      console.error('❌ Error stopping EnlevoHub:', error.message)
      process.exit(1)
    }
  }
}

stopEnlevoHub()
