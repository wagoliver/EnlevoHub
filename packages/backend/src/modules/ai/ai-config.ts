import * as fs from 'fs'
import * as path from 'path'

export type AIProvider = 'ollama-local' | 'ollama-docker' | 'groq' | 'openai-compatible'

export interface AIProviderConfig {
  provider: AIProvider
  ollamaUrl?: string
  apiKey?: string
  baseUrl?: string
  model: string
}

const BACKEND_ROOT = path.resolve(__dirname, '..', '..', '..')
const CONFIG_PATH = path.resolve(BACKEND_ROOT, 'data', 'ai-config.json')

const DEFAULTS: AIProviderConfig = {
  provider: 'ollama-local',
  ollamaUrl: 'http://localhost:11434',
  model: 'qwen3:1.7b',
}

export function readAIConfig(): AIProviderConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8')
      return JSON.parse(raw) as AIProviderConfig
    }
  } catch {
    // ignore invalid config
  }
  return null
}

export function saveAIConfig(config: AIProviderConfig): void {
  // Normalize: inject default baseUrl for Groq if missing
  if (config.provider === 'groq' && !config.baseUrl) {
    config.baseUrl = 'https://api.groq.com/openai/v1'
  }

  // Handle apiKey: __REMOVE__ clears it, empty keeps existing
  if (config.apiKey === '__REMOVE__') {
    delete config.apiKey
  } else if (!config.apiKey) {
    const existing = readAIConfig()
    if (existing?.apiKey) {
      config.apiKey = existing.apiKey
    }
  }

  const dir = path.dirname(CONFIG_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

/**
 * Returns AI config with fallback chain: config file → env vars → defaults
 */
export function getAIConfig(): AIProviderConfig {
  const fileConfig = readAIConfig()
  if (fileConfig) {
    return fileConfig
  }

  // Env vars fallback
  const envUrl = process.env.OLLAMA_URL
  const envModel = process.env.AI_MODEL
  if (envUrl || envModel) {
    return {
      provider: 'ollama-local',
      ollamaUrl: envUrl || DEFAULTS.ollamaUrl,
      model: envModel || DEFAULTS.model,
    }
  }

  return { ...DEFAULTS }
}

/**
 * Returns config with API key masked for safe frontend display
 */
export function getAIConfigMasked(): AIProviderConfig & { source: string } {
  const fileConfig = readAIConfig()
  let config: AIProviderConfig
  let source: string

  if (fileConfig) {
    config = fileConfig
    source = 'config'
  } else if (process.env.OLLAMA_URL || process.env.AI_MODEL) {
    config = {
      provider: 'ollama-local',
      ollamaUrl: process.env.OLLAMA_URL || DEFAULTS.ollamaUrl,
      model: process.env.AI_MODEL || DEFAULTS.model,
    }
    source = 'env'
  } else {
    config = { ...DEFAULTS }
    source = 'default'
  }

  return {
    ...config,
    apiKey: config.apiKey ? maskKey(config.apiKey) : undefined,
    source,
  }
}

function maskKey(key: string): string {
  if (key.length <= 8) return '****'
  return key.slice(0, 4) + '****' + key.slice(-4)
}
