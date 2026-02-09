#!/usr/bin/env node

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')

console.log('🔧 Setting up EnlevoHub...\n')

async function setup() {
  try {
    // 1. Install dependencies
    console.log('📦 Installing dependencies...')
    await runCommand('npm', ['install'], process.cwd())

    // 2. Create necessary directories
    console.log('\n📁 Creating runtime directories...')
    const dirs = [
      'runtime',
      'runtime/postgres',
      'runtime/postgres/data',
      'runtime/app',
      'logs',
      'backups',
      'storage',
    ]

    for (const dir of dirs) {
      const fullPath = path.join(process.cwd(), dir)
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true })
        console.log(`  ✓ Created ${dir}`)
      }
    }

    // 3. Copy .env.example to .env if not exists
    console.log('\n📝 Setting up environment...')
    const envPath = path.join(process.cwd(), '.env')
    const envExamplePath = path.join(process.cwd(), '.env.example')

    if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath)
      console.log('  ✓ Created .env file')
    } else if (fs.existsSync(envPath)) {
      console.log('  ✓ .env file already exists')
    }

    console.log('\n✅ Setup completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('  1. Run "npm run dev" to start EnlevoHub in development mode')
    console.log('  2. Open http://localhost:3000 in your browser')
    console.log('\nNote: On first run, Prisma will generate the client and build the packages automatically.')

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message)
    process.exit(1)
  }
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      shell: true,
      stdio: 'inherit'
    })

    proc.on('close', (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Command failed with code ${code}`))
      }
    })

    proc.on('error', reject)
  })
}

setup()
