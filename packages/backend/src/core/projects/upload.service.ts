import { MultipartFile } from '@fastify/multipart'
import * as fs from 'fs'
import * as path from 'path'
import { pipeline } from 'stream/promises'

const STORAGE_DIR = path.resolve(process.cwd(), 'storage', 'uploads', 'projects')

export class UploadService {
  constructor() {
    // Ensure storage directory exists
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true })
    }
  }

  async saveFile(projectId: string, file: MultipartFile): Promise<string> {
    const projectDir = path.join(STORAGE_DIR, projectId)
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true })
    }

    const ext = path.extname(file.filename) || '.jpg'
    const safeName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`
    const filePath = path.join(projectDir, safeName)

    await pipeline(file.file, fs.createWriteStream(filePath))

    // Return relative URL path
    return `/api/v1/projects/uploads/${projectId}/${safeName}`
  }

  async saveFiles(projectId: string, files: MultipartFile[]): Promise<string[]> {
    const urls: string[] = []
    for (const file of files) {
      const url = await this.saveFile(projectId, file)
      urls.push(url)
    }
    return urls
  }

  async deleteFile(filePath: string): Promise<void> {
    // Extract the relative path from URL
    const relativePath = filePath.replace('/api/v1/projects/uploads/', '')
    const fullPath = path.join(STORAGE_DIR, relativePath)

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath)
    }
  }

  getStorageDir(): string {
    return STORAGE_DIR
  }
}
