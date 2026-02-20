import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, Plug, Eye, EyeOff, Info, CheckCircle2, XCircle, Server, Cloud, Key, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { aiAPI } from '@/lib/api-client'

const PROVIDERS = [
  {
    value: 'ollama-local',
    label: 'Ollama Local',
    description: 'Ollama rodando na mesma máquina',
    icon: Server,
    defaultUrl: 'http://localhost:11434',
  },
  {
    value: 'ollama-docker',
    label: 'Ollama Docker',
    description: 'Ollama rodando em container Docker',
    icon: Server,
    defaultUrl: 'http://ollama:11434',
  },
  {
    value: 'groq',
    label: 'Groq Cloud',
    description: 'API cloud ultra-rápida (gratuita com limites)',
    icon: Cloud,
    defaultUrl: 'https://api.groq.com/openai/v1',
  },
  {
    value: 'openai-compatible',
    label: 'OpenAI-compatible',
    description: 'Qualquer API compatível com OpenAI (LM Studio, vLLM, etc.)',
    icon: Cloud,
    defaultUrl: '',
  },
] as const

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'qwen-qwq-32b',
  'deepseek-r1-distill-llama-70b',
  'gemma2-9b-it',
  'mixtral-8x7b-32768',
]

const aiConfigFormSchema = z.object({
  provider: z.enum(['ollama-local', 'ollama-docker', 'groq', 'openai-compatible']),
  ollamaUrl: z.string().optional(),
  apiKey: z.string().optional(),
  baseUrl: z.string().optional(),
  model: z.string().min(1, 'Modelo é obrigatório'),
})

type AIConfigFormData = z.infer<typeof aiConfigFormSchema>

export function AISettings() {
  const queryClient = useQueryClient()
  const [showApiKey, setShowApiKey] = useState(false)
  const [editingApiKey, setEditingApiKey] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)

  const { data: config, isLoading: isLoadingConfig } = useQuery({
    queryKey: ['ai-config'],
    queryFn: () => aiAPI.getConfig(),
  })

  const { data: healthData } = useQuery({
    queryKey: ['ai-health'],
    queryFn: () => aiAPI.health(),
    retry: false,
    refetchInterval: 30000,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<AIConfigFormData>({
    resolver: zodResolver(aiConfigFormSchema),
    defaultValues: {
      provider: 'ollama-docker',
      ollamaUrl: 'http://ollama:11434',
      model: 'qwen3:1.7b',
    },
  })

  // Sync form with fetched config
  useEffect(() => {
    if (config) {
      reset({
        provider: config.provider as AIConfigFormData['provider'],
        ollamaUrl: config.ollamaUrl || '',
        apiKey: '', // never pre-fill masked key
        baseUrl: config.baseUrl || '',
        model: config.model || '',
      })
    }
  }, [config, reset])

  const provider = watch('provider')
  const isOllama = provider === 'ollama-local' || provider === 'ollama-docker'
  const isGroq = provider === 'groq'

  // Update default URL when provider changes
  const handleProviderChange = (value: string) => {
    const p = PROVIDERS.find((pr) => pr.value === value)
    setValue('provider', value as AIConfigFormData['provider'], { shouldDirty: true })
    if (p) {
      if (value === 'ollama-local' || value === 'ollama-docker') {
        setValue('ollamaUrl', p.defaultUrl, { shouldDirty: true })
      } else {
        setValue('baseUrl', p.defaultUrl, { shouldDirty: true })
      }
    }
    // Clear test result when provider changes
    setTestResult(null)
  }

  const saveMutation = useMutation({
    mutationFn: (data: AIConfigFormData) => {
      const isOllamaProvider = data.provider === 'ollama-local' || data.provider === 'ollama-docker'
      const payload: any = {
        provider: data.provider,
        model: data.model,
      }
      if (isOllamaProvider) {
        payload.ollamaUrl = data.ollamaUrl || undefined
      } else {
        // For Groq, inject default baseUrl if empty
        const defaultBaseUrl = data.provider === 'groq' ? 'https://api.groq.com/openai/v1' : undefined
        payload.baseUrl = data.baseUrl || defaultBaseUrl
        if (data.apiKey === '__REMOVE__') {
          payload.apiKey = '__REMOVE__'
        } else if (data.apiKey) {
          payload.apiKey = data.apiKey
        }
      }
      return aiAPI.saveConfig(payload)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-config'] })
      queryClient.invalidateQueries({ queryKey: ['ai-health'] })
      setEditingApiKey(false)
      toast.success('Configuração de IA salva com sucesso')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao salvar configuração')
    },
  })

  const onSubmit = (data: AIConfigFormData) => {
    saveMutation.mutate(data)
  }

  const handleTestConnection = async () => {
    const values = watch()
    const isOllamaProvider = values.provider === 'ollama-local' || values.provider === 'ollama-docker'
    setIsTesting(true)
    setTestResult(null)
    try {
      const payload: any = {
        provider: values.provider,
        model: values.model || 'test',
      }
      if (isOllamaProvider) {
        payload.ollamaUrl = values.ollamaUrl || undefined
      } else {
        const defaultBaseUrl = values.provider === 'groq' ? 'https://api.groq.com/openai/v1' : undefined
        payload.baseUrl = values.baseUrl || defaultBaseUrl
        if (values.apiKey) {
          payload.apiKey = values.apiKey
        }
      }
      const result = await aiAPI.testConnection(payload)
      setTestResult(result)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao testar conexão'
      setTestResult({ success: false, message: msg })
      toast.error(msg)
    } finally {
      setIsTesting(false)
    }
  }

  if (isLoadingConfig) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  const isHealthy = healthData?.status === 'ok'

  return (
    <div className="space-y-6">
      {/* Status Badge */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status da IA</CardTitle>
              <CardDescription>Conexão atual com o provedor de IA</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {isHealthy ? (
                <Badge variant="completed" className="gap-1.5 py-1 px-3">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Conectado
                </Badge>
              ) : (
                <Badge variant="cancelled" className="gap-1.5 py-1 px-3">
                  <XCircle className="h-3.5 w-3.5" />
                  Desconectado
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        {healthData && (
          <CardContent className="pt-0">
            <div className="flex gap-4 text-sm text-neutral-500">
              <span>Provedor: <strong className="text-neutral-700">{healthData.provider || config?.provider || '-'}</strong></span>
              <span>Modelo: <strong className="text-neutral-700">{healthData.model || config?.model || '-'}</strong></span>
              {config?.source && (
                <span>Fonte: <strong className="text-neutral-700">{config.source === 'config' ? 'Arquivo' : config.source === 'env' ? 'Variável de ambiente' : 'Padrão'}</strong></span>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Config Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Provedor de IA</CardTitle>
            <CardDescription>
              Escolha e configure o provedor de inteligência artificial
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Provider Select with Cards */}
            <div className="space-y-2">
              <Label>Provedor</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {PROVIDERS.map((p) => {
                  const Icon = p.icon
                  const isSelected = provider === p.value
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => handleProviderChange(p.value)}
                      className={`flex items-start gap-3 rounded-lg border-2 p-4 text-left transition-colors ${
                        isSelected
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'
                      }`}
                    >
                      <Icon className={`h-5 w-5 mt-0.5 shrink-0 ${isSelected ? 'text-primary-600' : 'text-neutral-400'}`} />
                      <div>
                        <div className={`font-medium ${isSelected ? 'text-primary-700' : 'text-neutral-900'}`}>
                          {p.label}
                        </div>
                        <div className="text-xs text-neutral-500 mt-0.5">{p.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Dynamic fields per provider */}
            {isOllama && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ollamaUrl">URL do Ollama</Label>
                  <Input
                    id="ollamaUrl"
                    placeholder={provider === 'ollama-local' ? 'http://localhost:11434' : 'http://ollama:11434'}
                    {...register('ollamaUrl')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    placeholder="qwen3:1.7b"
                    {...register('model')}
                  />
                  {errors.model && (
                    <p className="text-sm text-error-600">{errors.model.message}</p>
                  )}
                </div>
              </div>
            )}

            {isGroq && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>API Key</Label>
                  {config?.apiKey && !editingApiKey ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 flex-1">
                        <Key className="h-4 w-4 shrink-0" />
                        <span>Chave configurada: <code className="font-mono">{config.apiKey}</code></span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingApiKey(true); setValue('apiKey', '', { shouldDirty: true }) }}
                      >
                        Alterar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => { setValue('apiKey', '__REMOVE__', { shouldDirty: true }) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          id="apiKey"
                          type={showApiKey ? 'text' : 'password'}
                          placeholder="gsk_..."
                          {...register('apiKey')}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {editingApiKey && (
                        <button
                          type="button"
                          className="text-xs text-neutral-500 hover:text-neutral-700 underline"
                          onClick={() => { setEditingApiKey(false); setValue('apiKey', '', { shouldDirty: false }) }}
                        >
                          Cancelar alteração
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Select
                    value={watch('model')}
                    onValueChange={(v) => setValue('model', v, { shouldDirty: true })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um modelo" />
                    </SelectTrigger>
                    <SelectContent>
                      {GROQ_MODELS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.model && (
                    <p className="text-sm text-error-600">{errors.model.message}</p>
                  )}
                </div>
              </div>
            )}

            {provider === 'openai-compatible' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">URL Base da API</Label>
                  <Input
                    id="baseUrl"
                    placeholder="http://localhost:1234/v1"
                    {...register('baseUrl')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Key (opcional)</Label>
                  {config?.apiKey && !editingApiKey ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 flex-1">
                        <Key className="h-4 w-4 shrink-0" />
                        <span>Chave configurada: <code className="font-mono">{config.apiKey}</code></span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingApiKey(true); setValue('apiKey', '', { shouldDirty: true }) }}
                      >
                        Alterar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => { setValue('apiKey', '__REMOVE__', { shouldDirty: true }) }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="relative">
                        <Input
                          id="apiKey"
                          type={showApiKey ? 'text' : 'password'}
                          placeholder="sk-..."
                          {...register('apiKey')}
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {editingApiKey && (
                        <button
                          type="button"
                          className="text-xs text-neutral-500 hover:text-neutral-700 underline"
                          onClick={() => { setEditingApiKey(false); setValue('apiKey', '', { shouldDirty: false }) }}
                        >
                          Cancelar alteração
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    placeholder="Nome do modelo (ex: gpt-4, llama3, etc.)"
                    {...register('model')}
                  />
                  {errors.model && (
                    <p className="text-sm text-error-600">{errors.model.message}</p>
                  )}
                </div>
              </div>
            )}

            {/* Test result */}
            {testResult && (
              <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
                testResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 shrink-0" />
                )}
                {testResult.message}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saveMutation.isPending || !isDirty}>
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Configuração
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleTestConnection}
                disabled={isTesting}
              >
                {isTesting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plug className="mr-2 h-4 w-4" />
                )}
                Testar Conexão
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Help Cards */}
      {isOllama && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex gap-3 pt-6">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Ollama {provider === 'ollama-local' ? 'Local' : 'Docker'}</h3>
              <p className="mt-1 text-sm text-blue-700">
                {provider === 'ollama-local'
                  ? 'Certifique-se de que o Ollama está instalado e rodando na máquina.'
                  : 'Certifique-se de que o container Docker do Ollama está rodando e acessível.'
                }
              </p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li><strong>Instalar:</strong> <code className="bg-blue-100 px-1 rounded">curl -fsSL https://ollama.com/install.sh | sh</code></li>
                <li><strong>Baixar modelo:</strong> <code className="bg-blue-100 px-1 rounded">ollama pull qwen3:1.7b</code></li>
                <li><strong>Verificar:</strong> <code className="bg-blue-100 px-1 rounded">ollama list</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {isGroq && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex gap-3 pt-6">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Groq Cloud</h3>
              <p className="mt-1 text-sm text-blue-700">
                API gratuita e ultra-rápida. Ideal para testes e uso com limites generosos.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li><strong>1.</strong> Crie uma conta em <code className="bg-blue-100 px-1 rounded">console.groq.com</code></li>
                <li><strong>2.</strong> Gere uma API Key em "API Keys"</li>
                <li><strong>3.</strong> Cole a chave no campo acima (começa com <code className="bg-blue-100 px-1 rounded">gsk_</code>)</li>
                <li><strong>Recomendado:</strong> <code className="bg-blue-100 px-1 rounded">llama-3.3-70b-versatile</code> para melhor qualidade</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {provider === 'openai-compatible' && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="flex gap-3 pt-6">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">API OpenAI-Compatible</h3>
              <p className="mt-1 text-sm text-blue-700">
                Qualquer servidor que implemente a API OpenAI Chat Completions.
              </p>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li><strong>LM Studio:</strong> <code className="bg-blue-100 px-1 rounded">http://localhost:1234/v1</code></li>
                <li><strong>vLLM:</strong> <code className="bg-blue-100 px-1 rounded">http://localhost:8000/v1</code></li>
                <li><strong>OpenRouter:</strong> <code className="bg-blue-100 px-1 rounded">https://openrouter.ai/api/v1</code></li>
                <li><strong>Together AI:</strong> <code className="bg-blue-100 px-1 rounded">https://api.together.xyz/v1</code></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
