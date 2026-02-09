import * as fs from 'fs'
import * as path from 'path'
import sharp from 'sharp'

function resolveStorageDir(): string {
  const base = process.env.STORAGE_PATH
    ? path.resolve(process.env.STORAGE_PATH)
    : path.resolve(process.cwd(), 'storage')
  return path.join(base, 'uploads', 'projects')
}

export class UploadService {
  private storageDir: string

  constructor() {
    this.storageDir = resolveStorageDir()
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true })
    }
  }

  async saveBuffer(projectId: string, buffer: Buffer): Promise<string> {
    const projectDir = path.join(this.storageDir, projectId)
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.jpg`
    const filePath = path.join(projectDir, safeName)

    // Compress with sharp: max 1920px width, JPEG quality 80, strip metadata
    const compressed = await sharp(buffer)
      .resize(1920, undefined, { withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer()

    fs.writeFileSync(filePath, compressed)

    return `/api/v1/projects/uploads/${projectId}/${safeName}`
  }

  async deleteFile(filePath: string): Promise<void> {
    const relativePath = filePath.replace('/api/v1/projects/uploads/', '')
    const fullPath = path.join(this.storageDir, relativePath)

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
  }

  getStorageDir(): string {
    return this.storageDir
  }

  getStorageBasePath(): string {
    const base = process.env.STORAGE_PATH
      ? path.resolve(process.env.STORAGE_PATH)
      : path.resolve(process.cwd(), 'storage')
    return base
  }
}
