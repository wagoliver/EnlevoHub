import { logger } from '../../utils/logger'

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const AI_MODEL = process.env.AI_MODEL || 'qwen3:1.7b'

interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface OllamaChatResponse {
  message: { role: string; content: string }
  done: boolean
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
- Configurações ficam na parte inferior do menu (Planejamentos, Usuários, Armazenamento)

/no_think`

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
- Responda SOMENTE com o JSON, sem texto adicional, sem markdown

/no_think`

export class AIService {
  private baseUrl: string
  private model: string

  constructor() {
    this.baseUrl = OLLAMA_URL
    this.model = AI_MODEL
  }

  async chat(userMessage: string, history: OllamaChatMessage[] = []): Promise<string> {
    const messages: OllamaChatMessage[] = [
      { role: 'system', content: FAQ_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: userMessage },
    ]

    return this.callOllama(messages)
  }

  async generateActivities(description: string, detailLevel: 'resumido' | 'padrao' | 'detalhado' = 'padrao'): Promise<any> {
    const activityCounts = {
      resumido: '10-15 atividades no total',
      padrao: '20-30 atividades no total',
      detalhado: '35-50 atividades no total',
    }

    const userPrompt = `Gere o cronograma para: ${description}

Nível de detalhe: ${activityCounts[detailLevel]}`

    const messages: OllamaChatMessage[] = [
      { role: 'system', content: GENERATE_ACTIVITIES_SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ]

    const response = await this.callOllama(messages)

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

  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`)
      return res.ok
    } catch {
      return false
    }
  }

  async ensureModel(): Promise<void> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`)
      if (!res.ok) return

      const data = await res.json() as { models: Array<{ name: string }> }
      const hasModel = data.models?.some((m: any) => m.name.includes(this.model.split(':')[0]))

      if (!hasModel) {
        logger.info(`Modelo ${this.model} não encontrado. Iniciando download...`)
        await fetch(`${this.baseUrl}/api/pull`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: this.model, stream: false }),
        })
        logger.info(`Modelo ${this.model} baixado com sucesso`)
      }
    } catch (error) {
      logger.warn({ error }, 'Não foi possível verificar/baixar modelo Ollama')
    }
  }

  private async callOllama(messages: OllamaChatMessage[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: 0.7,
          top_p: 0.8,
          top_k: 20,
          num_predict: 1024,
        },
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      logger.error({ status: res.status, body: errorText }, 'Erro na chamada Ollama')
      throw new Error(`Erro ao comunicar com IA: ${res.status}`)
    }

    const data = await res.json() as OllamaChatResponse
    return data.message.content
  }
}
