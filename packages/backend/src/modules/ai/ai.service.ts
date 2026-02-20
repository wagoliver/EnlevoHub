import { logger } from '../../utils/logger'
import { getAIConfig, AIProviderConfig, AIProvider } from './ai-config'

interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OllamaChatResponse {
  message: { role: string; content: string; thinking?: string }
  done: boolean
}

interface OpenAIChatResponse {
  choices: Array<{ message: { role: string; content: string } }>
}

const FAQ_SYSTEM_PROMPT = `Você é o assistente de IA do EnlevoHub, um sistema SaaS para gestão e acompanhamento de obras de construção civil.

REGRAS:
- Responda APENAS sobre funcionalidades do EnlevoHub
- Se a pergunta não for sobre o sistema, diga educadamente que só pode ajudar com o EnlevoHub
- Respostas curtas e objetivas, no máximo 3-4 frases
- Use linguagem simples e profissional em português brasileiro
- NÃO invente funcionalidades que não existem

FUNCIONALIDADES DO ENLEVOHUB:
- Dashboard: visão geral de projetos, progresso de obras, indicadores
- Projetos: cadastro e gestão de obras com fases, etapas e atividades
- Planejamento: templates de cronograma com fases hierárquicas (Fase > Etapa > Atividade)
- Unidades: gestão de unidades (apartamentos, lotes, casas) por projeto
- Fornecedores: cadastro, materiais, ordens de compra
- Empreiteiros: cadastro e vinculação a projetos
- Corretores: gestão de corretores e comissões
- Financeiro: contas a pagar/receber, fluxo de caixa
- Monitoramento: acompanhamento de progresso em tempo real
- Levantamento: levantamento de materiais com integração SINAPI
- SINAPI: base de dados de custos e insumos da construção civil
- Usuários: gestão com papéis (ADMIN, MANAGER, VIEWER)

NAVEGAÇÃO:
- Menu lateral esquerdo contém todas as seções
- Cada projeto tem abas: Visão Geral, Atividades, Unidades, Levantamento
- Configurações ficam na parte inferior do menu (Planejamentos, Usuários, Armazenamento)`

const GENERATE_ACTIVITIES_SYSTEM_PROMPT = `Você é um engenheiro civil especialista em planejamento de obras. Gere um cronograma hierárquico para a obra descrita.

FORMATO DE SAÍDA (JSON estrito):
{
  "phases": [
    {
      "name": "Nome da Fase",
      "percentage": 15,
      "color": "#hex",
      "stages": [
        {
          "name": "Nome da Etapa",
          "activities": [
            {
              "name": "Nome da Atividade",
              "weight": 3,
              "durationDays": 10,
              "dependencies": []
            }
          ]
        }
      ]
    }
  ]
}

REGRAS:
- Os percentuais das fases devem somar EXATAMENTE 100%
- Peso de 1 a 5 (1=simples, 5=complexo)
- Duração em dias úteis realistas
- Dependencies referencia nomes de outras atividades que devem terminar antes
- Use cores distintas para cada fase
- Cores disponíveis: #3b82f6, #ef4444, #22c55e, #f59e0b, #8b5cf6, #ec4899, #06b6d4, #f97316, #14b8a6, #6366f1
- Responda SOMENTE com o JSON, sem texto adicional, sem markdown`

const GENERATE_PHASE_SYSTEM_PROMPT = `Você é um engenheiro civil especialista em planejamento de obras com conhecimento da tabela SINAPI.

Gere as ETAPAS e ATIVIDADES para a fase de obra informada.

FORMATO DE SAÍDA (JSON estrito):
{
  "stages": [
    {
      "name": "Nome da Etapa",
      "activities": [
        {
          "name": "Nome da Atividade (usar nomenclatura SINAPI)",
          "weight": 3,
          "durationDays": 10,
          "dependencies": []
        }
      ]
    }
  ]
}

REGRAS IMPORTANTES:
- Use nomes de atividades alinhados com a nomenclatura SINAPI (ex: "Chapisco e reboco", "Levantamento de paredes", "Contrapiso e nivelamento", "Piso cerâmico/porcelanato")
- Peso de 1 a 5 (1=simples/rápido, 5=complexo/crítico)
- Duração em dias úteis realistas para construção civil brasileira
- Dependencies referencia nomes de atividades que devem terminar antes (da mesma fase)
- Gere entre 3 e 8 etapas por fase, com 1 a 4 atividades por etapa
- Responda SOMENTE com o JSON, sem texto adicional, sem markdown

EXEMPLOS DE NOMES SINAPI POR FASE:
- Fundação: Limpeza do terreno, Escavação, Estacas/Sapatas, Baldrame, Impermeabilização de fundação
- Estrutura: Levantamento de paredes, Vergas e contravergas, Estrutura do telhado, Telhas, Laje
- Instalações: Tubulação hidráulica, Fiação elétrica, Quadro de distribuição, Esgoto e caixas de inspeção
- Acabamento: Chapisco e reboco, Contrapiso e nivelamento, Piso cerâmico/porcelanato, Massa corrida, Pintura final, Azulejo (áreas molhadas)
- Cobertura: Estrutura de madeira para telhado, Telhas cerâmicas/concreto, Calhas e rufos, Impermeabilização de laje`

export class AIService {
  /**
   * Always reads fresh config from file on each access.
   * This ensures manual edits to ai-config.json take effect without restart.
   */
  private get config(): AIProviderConfig {
    return getAIConfig()
  }

  reloadConfig(): void {
    // Config is now read fresh each time, this method just logs for confirmation
    const config = getAIConfig()
    logger.info({ provider: config.provider, model: config.model }, 'AI config reloaded')
  }

  async chat(userMessage: string, history: ChatMessage[] = []): Promise<string> {
    const messages: ChatMessage[] = [
      { role: 'system', content: FAQ_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: this.appendNoThink(userMessage) },
    ]

    return this.callProvider(messages)
  }

  async generateActivities(description: string, detailLevel: 'resumido' | 'padrao' | 'detalhado' = 'padrao'): Promise<any> {
    const activityCounts = {
      resumido: '10-15 atividades no total',
      padrao: '20-30 atividades no total',
      detalhado: '35-50 atividades no total',
    }

    const userPrompt = this.appendNoThink(`Gere o cronograma para: ${description}\n\nNível de detalhe: ${activityCounts[detailLevel]}`)

    const messages: ChatMessage[] = [
      { role: 'system', content: GENERATE_ACTIVITIES_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]

    const response = await this.callProvider(messages, 2048)

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('IA não retornou JSON válido')
      }
      return JSON.parse(jsonMatch[0])
    } catch (parseError) {
      logger.error({ response }, 'Falha ao parsear resposta da IA para atividades')
      throw new Error('A IA não conseguiu gerar um cronograma válido. Tente novamente com uma descrição mais detalhada.')
    }
  }

  async generatePhase(phaseName: string, context?: string): Promise<any> {
    const userPrompt = context
      ? this.appendNoThink(`Gere etapas e atividades para a fase "${phaseName}".\nContexto adicional da obra: ${context}`)
      : this.appendNoThink(`Gere etapas e atividades para a fase "${phaseName}".`)

    const messages: ChatMessage[] = [
      { role: 'system', content: GENERATE_PHASE_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]

    const response = await this.callProvider(messages, 2048)

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('IA não retornou JSON válido')
      }
      return JSON.parse(jsonMatch[0])
    } catch {
      logger.error({ response }, 'Falha ao parsear resposta da IA para fase')
      throw new Error('A IA não conseguiu gerar as atividades. Tente novamente.')
    }
  }

  async checkHealth(): Promise<{ healthy: boolean; provider: AIProvider; model: string }> {
    const { provider, model } = this.config
    try {
      if (this.isOllama()) {
        const res = await fetch(`${this.getOllamaUrl()}/api/tags`)
        return { healthy: res.ok, provider, model }
      }
      // Cloud providers: test with a minimal request
      const url = this.getOpenAIBaseUrl()
      const res = await fetch(`${url}/models`, {
        headers: this.getAuthHeaders(),
      })
      return { healthy: res.ok, provider, model }
    } catch {
      return { healthy: false, provider, model }
    }
  }

  async ensureModel(): Promise<void> {
    if (!this.isOllama()) return
    try {
      const ollamaUrl = this.getOllamaUrl()
      const res = await fetch(`${ollamaUrl}/api/tags`)
      if (!res.ok) return

      const data = await res.json() as { models: Array<{ name: string }> }
      const hasModel = data.models?.some((m: any) => m.name.includes(this.config.model.split(':')[0]))

      if (!hasModel) {
        logger.info(`Modelo ${this.config.model} não encontrado. Iniciando download...`)
        await fetch(`${ollamaUrl}/api/pull`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.config.model, stream: false }),
        })
        logger.info(`Modelo ${this.config.model} baixado com sucesso`)
      }
    } catch (error) {
      logger.warn({ error }, 'Não foi possível verificar/baixar modelo Ollama')
    }
  }

  async listModels(): Promise<string[]> {
    try {
      if (this.isOllama()) {
        const res = await fetch(`${this.getOllamaUrl()}/api/tags`)
        if (!res.ok) return []
        const data = await res.json() as { models: Array<{ name: string }> }
        return data.models?.map((m) => m.name) || []
      }
      // OpenAI-compatible: GET /models
      const url = this.getOpenAIBaseUrl()
      const res = await fetch(`${url}/models`, {
        headers: this.getAuthHeaders(),
      })
      if (!res.ok) return []
      const data = await res.json() as { data: Array<{ id: string }> }
      return data.data?.map((m) => m.id) || []
    } catch {
      return []
    }
  }

  /**
   * Test connection with a given config (before saving)
   */
  async testConnection(testConfig: AIProviderConfig): Promise<{ success: boolean; message: string; models?: string[] }> {
    try {
      const isOllama = testConfig.provider === 'ollama-local' || testConfig.provider === 'ollama-docker'

      if (isOllama) {
        const url = testConfig.ollamaUrl || 'http://localhost:11434'
        const res = await fetch(`${url}/api/tags`)
        if (!res.ok) {
          return { success: false, message: `Ollama retornou status ${res.status}` }
        }
        const data = await res.json() as { models: Array<{ name: string }> }
        const models = data.models?.map((m) => m.name) || []
        return { success: true, message: `Conectado! ${models.length} modelo(s) disponível(is).`, models }
      }

      // Cloud provider
      const baseUrl = testConfig.baseUrl || (testConfig.provider === 'groq' ? 'https://api.groq.com/openai/v1' : '')
      if (!baseUrl) {
        return { success: false, message: 'URL base é obrigatória' }
      }

      // Resolve API key: __USE_SAVED__ reads from saved config file
      let apiKey = testConfig.apiKey
      if (apiKey === '__USE_SAVED__') {
        apiKey = this.config.apiKey
      }
      if (!apiKey) {
        return { success: false, message: 'API Key é obrigatória' }
      }

      const res = await fetch(`${baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })

      if (!res.ok) {
        return { success: false, message: `Provedor retornou status ${res.status}` }
      }

      const data = await res.json() as { data: Array<{ id: string }> }
      const models = data.data?.map((m) => m.id) || []
      return { success: true, message: `Conectado! ${models.length} modelo(s) disponível(is).`, models }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido'
      return { success: false, message: `Falha na conexão: ${msg}` }
    }
  }

  // --- Private helpers ---

  private isOllama(): boolean {
    return this.config.provider === 'ollama-local' || this.config.provider === 'ollama-docker'
  }

  private getOllamaUrl(): string {
    return this.config.ollamaUrl || 'http://localhost:11434'
  }

  private getOpenAIBaseUrl(): string {
    if (this.config.provider === 'groq') {
      return this.config.baseUrl || 'https://api.groq.com/openai/v1'
    }
    return this.config.baseUrl || ''
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }
    return headers
  }

  /**
   * Append /no_think only for Ollama + qwen models
   */
  private appendNoThink(text: string): string {
    if (this.isOllama() && this.config.model.toLowerCase().includes('qwen')) {
      return `${text} /no_think`
    }
    return text
  }

  private async callProvider(messages: ChatMessage[], maxTokens = 1024): Promise<string> {
    if (this.isOllama()) {
      return this.callOllama(messages, maxTokens)
    }
    return this.callOpenAI(messages, maxTokens)
  }

  private async callOllama(messages: ChatMessage[], maxTokens: number): Promise<string> {
    const url = this.getOllamaUrl()
    const res = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.8,
          top_k: 20,
          num_predict: maxTokens,
        },
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      logger.error({ status: res.status, body: errorText }, 'Erro na chamada Ollama')
      throw new Error(`Erro ao comunicar com IA: ${res.status}`)
    }

    const data = await res.json() as OllamaChatResponse
    return data.message.content || data.message.thinking || ''
  }

  private async callOpenAI(messages: ChatMessage[], maxTokens: number): Promise<string> {
    const url = this.getOpenAIBaseUrl()
    if (!url) {
      throw new Error('URL base do provedor de IA não configurada')
    }

    const res = await fetch(`${url}/chat/completions`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.8,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      logger.error({ status: res.status, body: errorText }, 'Erro na chamada OpenAI-compatible')
      throw new Error(`Erro ao comunicar com IA: ${res.status}`)
    }

    const data = await res.json() as OpenAIChatResponse
    return data.choices?.[0]?.message?.content || ''
  }
}
