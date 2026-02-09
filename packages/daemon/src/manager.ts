import { ChildProcess, spawn } from 'child_process'
import path from 'path'
import { logger } from './logger'
import { PostgresManager } from './postgres'
import { checkPort, waitForPort } from './utils'

export interface ProcessInfo {
  name: string
  process: ChildProcess | null
  status: 'stopped' | 'starting' | 'running' | 'failed'
  restartCount: number
  lastRestart?: Date
}

export class EnlevoHubDaemon {
  private processes: Map<string, ProcessInfo> = new Map()
  private postgresManager: PostgresManager
  private isShuttingDown = false
  private healthCheckInterval?: NodeJS.Timeout

  constructor() {
    this.postgresManager = new PostgresManager()
  }

  async start() {
    logger.info('🚀 Starting EnlevoHub Master Process...')

    try {
      // 1. Check and find available ports
      const apiPort = await this.findAvailablePort(3001)
      const frontendPort = await this.findAvailablePort(3000)
      const pgPort = await this.findAvailablePort(5432)

      logger.info({ apiPort, frontendPort, pgPort }, 'Ports assigned')

      // 2. Start PostgreSQL (optional in dev mode)
      const skipPostgres = process.env.SKIP_POSTGRES === 'true'
      if (!skipPostgres) {
        try {
          logger.info('📦 Starting PostgreSQL...')
          await this.postgresManager.start(pgPort)
          logger.info('✅ PostgreSQL started successfully')

          // 3. Wait for PostgreSQL to be ready
          await this.waitForDatabase()

          // 4. Run database migrations
          logger.info('🔄 Running database migrations...')
          await this.runMigrations()
          logger.info('✅ Migrations completed')
        } catch (error) {
          logger.warn({ error }, 'PostgreSQL not available, continuing without database')
          logger.info('💡 Running in development mode without database')
        }
      } else {
        logger.info('⚠️  Skipping PostgreSQL (SKIP_POSTGRES=true)')
      }

      // 5. Start Backend API
      logger.info('🔌 Starting Backend API...')
      await this.startBackend(apiPort)
      logger.info('✅ Backend API started')

      // 6. Start Frontend
      logger.info('🎨 Starting Frontend...')
      await this.startFrontend(frontendPort)
      logger.info('✅ Frontend started')

      // 7. Start health checks
      this.startHealthChecks()

      // 8. Open browser
      this.openBrowser(`http://localhost:${frontendPort}`)

      logger.info('✨ EnlevoHub is running!')
      logger.info(`📱 Frontend: http://localhost:${frontendPort}`)
      logger.info(`🔌 API: http://localhost:${apiPort}`)
      logger.info(`📊 API Docs: http://localhost:${apiPort}/docs`)

    } catch (error) {
      logger.error({ error }, 'Failed to start EnlevoHub')
      await this.stop()
      throw error
    }
  }

  async stop() {
    if (this.isShuttingDown) return
    this.isShuttingDown = true

    logger.info('🛑 Stopping EnlevoHub...')

    // Stop health checks
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
    }

    // Stop all processes in reverse order
    const processNames = Array.from(this.processes.keys()).reverse()
    for (const name of processNames) {
      await this.stopProcess(name)
    }

    // Stop PostgreSQL
    await this.postgresManager.stop()

    logger.info('✅ EnlevoHub stopped successfully')
  }

  private async findAvailablePort(preferredPort: number): Promise<number> {
    const isAvailable = await checkPort(preferredPort)
    if (isAvailable) return preferredPort

    // Try next 10 ports
    for (let i = 1; i <= 10; i++) {
      const port = preferredPort + i
      const available = await checkPort(port)
      if (available) {
        logger.warn(`Port ${preferredPort} is busy, using ${port} instead`)
        return port
      }
    }

    throw new Error(`No available ports found near ${preferredPort}`)
  }

  private async waitForDatabase() {
    const maxRetries = 30
    const retryInterval = 1000

    for (let i = 0; i < maxRetries; i++) {
      try {
        // Try to connect to PostgreSQL
        await this.postgresManager.isReady()
        return
      } catch (error) {
        if (i === maxRetries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, retryInterval))
      }
    }
  }

  private async runMigrations() {
    return new Promise<void>((resolve, reject) => {
      const backendDir = path.join(__dirname, '../../backend')
      const proc = spawn('npm', ['run', 'prisma:push'], {
        cwd: backendDir,
        shell: true,
        env: { ...process.env },
      })

      proc.stdout?.on('data', (data) => {
        logger.debug({ output: data.toString() }, 'Migration output')
      })

      proc.stderr?.on('data', (data) => {
        logger.warn({ output: data.toString() }, 'Migration warning')
      })

      proc.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Migration failed with code ${code}`))
        }
      })
    })
  }

  private async startBackend(port: number) {
    const backendDir = path.join(__dirname, '../../backend')
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: process.env.NODE_ENV || 'development',
    }

    const proc = spawn('npm', ['run', 'dev'], {
      cwd: backendDir,
      shell: true,
      env,
    })

    this.processes.set('backend', {
      name: 'Backend API',
      process: proc,
      status: 'starting',
      restartCount: 0,
    })

    this.attachProcessHandlers(proc, 'backend')

    // Wait for backend to be ready
    await waitForPort(port, 30000)
    this.updateProcessStatus('backend', 'running')
  }

  private async startFrontend(port: number) {
    const frontendDir = path.join(__dirname, '../../frontend')
    const env = {
      ...process.env,
      PORT: port.toString(),
    }

    const proc = spawn('npm', ['run', 'dev'], {
      cwd: frontendDir,
      shell: true,
      env,
    })

    this.processes.set('frontend', {
      name: 'Frontend',
      process: proc,
      status: 'starting',
      restartCount: 0,
    })

    this.attachProcessHandlers(proc, 'frontend')

    // Wait for frontend to be ready
    await waitForPort(port, 30000)
    this.updateProcessStatus('frontend', 'running')
  }

  private attachProcessHandlers(proc: ChildProcess, name: string) {
    proc.stdout?.on('data', (data) => {
      logger.debug({ process: name, output: data.toString().trim() }, 'Process output')
    })

    proc.stderr?.on('data', (data) => {
      logger.warn({ process: name, output: data.toString().trim() }, 'Process error output')
    })

    proc.on('error', (error) => {
      logger.error({ process: name, error }, 'Process error')
      this.updateProcessStatus(name, 'failed')
    })

    proc.on('exit', (code, signal) => {
      logger.warn({ process: name, code, signal }, 'Process exited')

      if (!this.isShuttingDown) {
        this.updateProcessStatus(name, 'stopped')
        this.handleProcessCrash(name)
      }
    })
  }

  private async handleProcessCrash(name: string) {
    const info = this.processes.get(name)
    if (!info) return

    const maxRestarts = 3
    if (info.restartCount >= maxRestarts) {
      logger.error({ process: name }, 'Process crashed too many times, not restarting')
      return
    }

    logger.info({ process: name, attempt: info.restartCount + 1 }, 'Restarting crashed process')
    info.restartCount++
    info.lastRestart = new Date()

    // Wait a bit before restarting
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Restart logic based on process type
    if (name === 'backend') {
      await this.startBackend(3001) // Use stored port
    } else if (name === 'frontend') {
      await this.startFrontend(3000) // Use stored port
    }
  }

  private updateProcessStatus(name: string, status: ProcessInfo['status']) {
    const info = this.processes.get(name)
    if (info) {
      info.status = status
      logger.info({ process: name, status }, 'Process status updated')
    }
  }

  private async stopProcess(name: string) {
    const info = this.processes.get(name)
    if (!info || !info.process) return

    logger.info({ process: name }, 'Stopping process')

    return new Promise<void>((resolve) => {
      const proc = info.process!

      proc.on('exit', () => {
        this.updateProcessStatus(name, 'stopped')
        resolve()
      })

      // Try graceful shutdown first
      proc.kill('SIGTERM')

      // Force kill after 5 seconds
      setTimeout(() => {
        if (!proc.killed) {
          logger.warn({ process: name }, 'Force killing process')
          proc.kill('SIGKILL')
          resolve()
        }
      }, 5000)
    })
  }

  private startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck()
    }, 30000) // Every 30 seconds
  }

  private async performHealthCheck() {
    logger.debug('Performing health check')

    for (const [name, info] of this.processes.entries()) {
      if (info.process && info.process.killed) {
        logger.warn({ process: name }, 'Process is dead')
        this.updateProcessStatus(name, 'failed')
      }
    }

    // Check PostgreSQL
    try {
      await this.postgresManager.isReady()
    } catch (error) {
      logger.error({ error }, 'PostgreSQL health check failed')
    }
  }

  private openBrowser(url: string) {
    const platform = process.platform
    let command: string

    switch (platform) {
      case 'darwin':
        command = 'open'
        break
      case 'win32':
        command = 'start'
        break
      default:
        command = 'xdg-open'
    }

    spawn(command, [url], { detached: true, stdio: 'ignore' }).unref()
  }
}
