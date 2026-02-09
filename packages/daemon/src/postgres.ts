import { spawn, ChildProcess } from 'child_process'
import path from 'path'
import fs from 'fs'
import { logger } from './logger'

export class PostgresManager {
  private process: ChildProcess | null = null
  private dataDir: string
  private binDir: string
  private port: number = 5432

  constructor() {
    const runtimeDir = path.join(process.cwd(), 'runtime')
    this.dataDir = path.join(runtimeDir, 'postgres', 'data')
    this.binDir = path.join(runtimeDir, 'postgres', 'bin')
  }

  async start(port: number = 5432) {
    this.port = port

    // Check if PostgreSQL is already installed system-wide
    const useSystemPostgres = await this.checkSystemPostgres()

    if (useSystemPostgres) {
      logger.info('Using system PostgreSQL installation')
      await this.startSystemPostgres()
    } else {
      logger.info('Using portable PostgreSQL')
      await this.startPortablePostgres()
    }
  }

  async stop() {
    if (!this.process) return

    logger.info('Stopping PostgreSQL...')

    return new Promise<void>((resolve) => {
      this.process!.on('exit', () => {
        logger.info('PostgreSQL stopped')
        resolve()
      })

      this.process!.kill('SIGTERM')

      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL')
          resolve()
        }
      }, 5000)
    })
  }

  async isReady(): Promise<boolean> {
    // Try to connect using pg_isready or direct connection check
    return new Promise((resolve) => {
      // Simple implementation - in production, use actual PostgreSQL client
      const timeout = setTimeout(() => resolve(true), 1000)

      // For now, just assume it's ready after a delay
      // In production, implement actual connection check
      timeout
      resolve(true)
    })
  }

  private async checkSystemPostgres(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn('pg_ctl', ['--version'], { shell: true })

      proc.on('error', () => resolve(false))
      proc.on('exit', (code) => resolve(code === 0))
    })
  }

  private async startSystemPostgres() {
    // Ensure data directory exists and is initialized
    await this.ensureDataDirectory()

    const args = [
      '-D', this.dataDir,
      '-l', path.join(this.dataDir, 'postgresql.log'),
      'start'
    ]

    this.process = spawn('pg_ctl', args, {
      shell: true,
      detached: false,
    })

    await this.waitForStartup()
  }

  private async startPortablePostgres() {
    // Ensure data directory exists and is initialized
    await this.ensureDataDirectory()

    const pgBin = path.join(this.binDir, 'pg_ctl')

    if (!fs.existsSync(pgBin)) {
      throw new Error(
        'PostgreSQL portable not found. Please run setup script to download PostgreSQL.'
      )
    }

    const args = [
      '-D', this.dataDir,
      '-l', path.join(this.dataDir, 'postgresql.log'),
      'start'
    ]

    this.process = spawn(pgBin, args, {
      shell: true,
      detached: false,
    })

    await this.waitForStartup()
  }

  private async ensureDataDirectory() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true })
      await this.initDatabase()
    }
  }

  private async initDatabase() {
    logger.info('Initializing PostgreSQL database...')

    return new Promise<void>((resolve, reject) => {
      const args = [
        '-D', this.dataDir,
        '-U', 'enlevohub',
        '--pwfile', '-'
      ]

      const proc = spawn('initdb', args, {
        shell: true,
      })

      // Send password
      proc.stdin?.write('enlevohub\n')
      proc.stdin?.end()

      proc.on('exit', (code) => {
        if (code === 0) {
          logger.info('Database initialized successfully')
          this.configurePostgres()
          resolve()
        } else {
          reject(new Error(`initdb failed with code ${code}`))
        }
      })
    })
  }

  private configurePostgres() {
    const confFile = path.join(this.dataDir, 'postgresql.conf')
    const hbaFile = path.join(this.dataDir, 'pg_hba.conf')

    // Update postgresql.conf
    let conf = fs.readFileSync(confFile, 'utf8')
    conf += `\n# EnlevoHub Configuration\n`
    conf += `port = ${this.port}\n`
    conf += `max_connections = 100\n`
    conf += `shared_buffers = 128MB\n`
    conf += `logging_collector = on\n`
    fs.writeFileSync(confFile, conf)

    // Update pg_hba.conf for local connections
    let hba = fs.readFileSync(hbaFile, 'utf8')
    hba += `\n# EnlevoHub - Allow local connections\n`
    hba += `host    all    all    127.0.0.1/32    trust\n`
    hba += `host    all    all    ::1/128         trust\n`
    fs.writeFileSync(hbaFile, hba)
  }

  private async waitForStartup() {
    const maxWait = 30000 // 30 seconds
    const startTime = Date.now()

    while (Date.now() - startTime < maxWait) {
      try {
        const ready = await this.isReady()
        if (ready) return
      } catch (error) {
        // Not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, 500))
    }

    throw new Error('PostgreSQL failed to start within timeout')
  }
}
