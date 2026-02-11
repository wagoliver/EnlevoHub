import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

export interface Drive {
  letter: string
  label: string
  type: 'local' | 'network' | 'removable' | 'other'
  totalGB: number
  freeGB: number
  usedPercent: number
}

export interface TestResult {
  success: boolean
  message: string
  freeGB?: number
}

interface StorageConfig {
  storagePath: string
}

// Resolve relative to the backend package root, regardless of process.cwd()
const BACKEND_ROOT = path.resolve(__dirname, '..', '..', '..')
const CONFIG_PATH = path.resolve(BACKEND_ROOT, 'data', 'storage-config.json')

function readConfig(): StorageConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
      return JSON.parse(raw) as StorageConfig
    }
  } catch {
    // ignore invalid config
  }
  return null
}

export function getStoragePath(): string {
  const config = readConfig()
  if (config?.storagePath) {
    return path.resolve(config.storagePath)
  }
  if (process.env.STORAGE_PATH) {
    return path.resolve(process.env.STORAGE_PATH)
  }
  return path.resolve(BACKEND_ROOT, 'storage')
}

export function saveStoragePath(storagePath: string): void {
  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const config: StorageConfig = { storagePath }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

export function getStorageConfig(): { storagePath: string; source: string } {
  const config = readConfig()
  if (config?.storagePath) {
    return { storagePath: path.resolve(config.storagePath), source: 'config' }
  }
  if (process.env.STORAGE_PATH) {
    return { storagePath: path.resolve(process.env.STORAGE_PATH), source: 'env' }
  }
  return { storagePath: path.resolve(BACKEND_ROOT, 'storage'), source: 'default' }
}

export function getAvailableDrives(): Drive[] {
  const isWindows = process.platform === 'win32'

  if (isWindows) {
    return getWindowsDrives()
  }
  return getLinuxDrives()
}

function getWindowsDrives(): Drive[] {
  try {
    const output = execSync(
      'wmic logicaldisk get DeviceID,VolumeName,DriveType,Size,FreeSpace /format:csv',
      { encoding: 'utf8', timeout: 10000 }
    )
    const lines = output.trim().split('\n').filter((l) => l.trim().length > 0)
    // First line is header: Node,DeviceID,DriveType,FreeSpace,Size,VolumeName
    const drives: Drive[] = []

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(',')
      // CSV: Node,DeviceID,DriveType,FreeSpace,Size,VolumeName
      if (parts.length < 5) continue

      const deviceId = parts[1]?.trim()
      const driveTypeNum = parseInt(parts[2]?.trim() || '0', 10)
      const freeSpace = parseInt(parts[3]?.trim() || '0', 10)
      const size = parseInt(parts[4]?.trim() || '0', 10)
      const volumeName = parts[5]?.trim() || ''

      if (!deviceId || size === 0) continue

      let type: Drive['type'] = 'other'
      if (driveTypeNum === 2) type = 'removable'
      else if (driveTypeNum === 3) type = 'local'
      else if (driveTypeNum === 4) type = 'network'

      const totalGB = size / (1024 * 1024 * 1024)
      const freeGB = freeSpace / (1024 * 1024 * 1024)
      const usedPercent = totalGB > 0
        ? Math.round(((totalGB - freeGB) / totalGB) * 10000) / 100
        : 0

      drives.push({
        letter: deviceId,
        label: volumeName || deviceId,
        type,
        totalGB: Math.round(totalGB * 100) / 100,
        freeGB: Math.round(freeGB * 100) / 100,
        usedPercent,
      })
    }

    return drives
  } catch {
    return []
  }
}

function getLinuxDrives(): Drive[] {
  try {
    const output = execSync('df -BG --output=target,size,avail,fstype 2>/dev/null || df -BG', {
      encoding: 'utf8',
      timeout: 10000,
    })
    const lines = output.trim().split('\n')
    const drives: Drive[] = []

    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].trim().split(/\s+/)
      if (parts.length < 3) continue

      const mountPoint = parts[0]
      const totalGB = parseInt(parts[1], 10) || 0
      const freeGB = parseInt(parts[2], 10) || 0

      // Skip pseudo filesystems
      if (mountPoint.startsWith('/dev') || mountPoint.startsWith('/sys') || mountPoint.startsWith('/proc') || mountPoint === 'tmpfs') {
        continue
      }

      const usedPercent = totalGB > 0
        ? Math.round(((totalGB - freeGB) / totalGB) * 10000) / 100
        : 0

      drives.push({
        letter: mountPoint,
        label: mountPoint,
        type: 'local',
        totalGB,
        freeGB,
        usedPercent,
      })
    }

    return drives
  } catch {
    return []
  }
}

export function testStoragePath(targetPath: string): TestResult {
  try {
    const resolved = path.resolve(targetPath)

    // Ensure directory exists (create if needed)
    if (!fs.existsSync(resolved)) {
      fs.mkdirSync(resolved, { recursive: true })
    }

    // Test write
    const testFile = path.join(resolved, `.enlevo-test-${Date.now()}.tmp`)
    fs.writeFileSync(testFile, 'EnlevoHub storage test')
    fs.unlinkSync(testFile)

    // Get free space of the drive
    const freeGB = getDriveFreeGB(resolved)

    return {
      success: true,
      message: 'Caminho acessivel e gravavel',
      freeGB,
    }
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : 'Erro ao testar caminho',
    }
  }
}

function getDriveFreeGB(targetPath: string): number | undefined {
  try {
    const isWindows = process.platform === 'win32'

    if (isWindows) {
      const drive = path.resolve(targetPath).substring(0, 2)
      const output = execSync(
        `wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace /format:csv`,
        { encoding: 'utf8', timeout: 5000 }
      )
      const lines = output.trim().split('\n').filter((l) => l.trim().length > 0)
      const lastLine = lines[lines.length - 1]
      const parts = lastLine.split(',')
      if (parts.length >= 2) {
        return Math.round((parseInt(parts[1], 10) / (1024 * 1024 * 1024)) * 100) / 100
      }
    } else {
      const output = execSync(`df -BG "${targetPath}" | tail -1`, {
        encoding: 'utf8',
        timeout: 5000,
      })
      const parts = output.trim().split(/\s+/)
      if (parts.length >= 4) {
        return parseInt(parts[3], 10)
      }
    }
  } catch {
    // ignore
  }
  return undefined
}
