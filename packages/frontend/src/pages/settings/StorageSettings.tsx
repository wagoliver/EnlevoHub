import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import {
  Loader2,
  HardDrive,
  CheckCircle2,
  XCircle,
  FolderOpen,
  Save,
  FlaskConical,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { tenantAPI } from '@/lib/api-client'
import { useRole } from '@/hooks/usePermission'

interface Drive {
  letter: string
  label: string
  type: 'local' | 'network' | 'removable' | 'other'
  totalGB: number
  freeGB: number
  usedPercent: number
}

interface StorageConfig {
  storagePath: string
  source: string
}

interface TestResult {
  success: boolean
  message: string
  freeGB?: number
}

export function StorageSettings() {
  const role = useRole()
  const [customPath, setCustomPath] = useState('')
  const [testResult, setTestResult] = useState<TestResult | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pathTested, setPathTested] = useState(false)

  if (role !== 'ROOT') {
    return <Navigate to="/" replace />
  }

  const { data: storageConfig, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['storage-config'],
    queryFn: () => tenantAPI.getStorageConfig() as Promise<StorageConfig>,
  })

  const { data: drives, isLoading: drivesLoading } = useQuery({
    queryKey: ['drives'],
    queryFn: () => tenantAPI.getDrives() as Promise<Drive[]>,
  })

  const handleDriveClick = (drive: Drive) => {
    const isWindows = drive.letter.includes(':')
    const suggestion = isWindows
      ? `${drive.letter}\\EnlevoHub\\storage`
      : `${drive.letter}/enlevohub/storage`
    setCustomPath(suggestion)
    setTestResult(null)
    setPathTested(false)
  }

  const handleTest = async () => {
    if (!customPath.trim()) {
      toast.error('Informe um caminho para testar')
      return
    }
    setIsTesting(true)
    setTestResult(null)
    try {
      const result = await tenantAPI.testStoragePath(customPath.trim()) as TestResult
      setTestResult(result)
      setPathTested(result.success)
      if (result.success) {
        toast.success('Caminho testado com sucesso')
      } else {
        toast.error(result.message)
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao testar caminho'
      setTestResult({ success: false, message: msg })
      setPathTested(false)
      toast.error(msg)
    } finally {
      setIsTesting(false)
    }
  }

  const handleSave = async () => {
    if (!pathTested) {
      toast.error('Teste o caminho antes de salvar')
      return
    }
    setIsSaving(true)
    try {
      await tenantAPI.saveStorageConfig(customPath.trim())
      toast.success('Configuracao de armazenamento salva com sucesso')
      setTestResult(null)
      setPathTested(false)
      setCustomPath('')
      refetchConfig()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao salvar configuracao')
    } finally {
      setIsSaving(false)
    }
  }

  const getDriveTypeBadge = (type: Drive['type']) => {
    switch (type) {
      case 'local':
        return <Badge variant="planning">Local</Badge>
      case 'network':
        return <Badge variant="inProgress">Rede</Badge>
      case 'removable':
        return <Badge variant="paused">Removivel</Badge>
      default:
        return <Badge variant="outline">Outro</Badge>
    }
  }

  const getUsageColor = (percent: number) => {
    if (percent > 90) return 'text-red-600'
    if (percent > 75) return 'text-amber-600'
    return 'text-green-600'
  }

  const getSourceLabel = (source: string) => {
    switch (source) {
      case 'config':
        return 'Arquivo de configuracao'
      case 'env':
        return 'Variavel de ambiente (STORAGE_PATH)'
      default:
        return 'Padrao do sistema'
    }
  }

  if (configLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Configuracoes de Armazenamento</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Configure onde fotos e documentos serao armazenados no servidor.
        </p>
      </div>

      {/* Current Config */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderOpen className="h-5 w-5" />
            Caminho Atual
          </CardTitle>
          <CardDescription>
            Caminho atualmente utilizado para armazenamento de arquivos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <code className="rounded bg-neutral-100 px-3 py-2 text-sm font-mono flex-1">
              {storageConfig?.storagePath || './storage'}
            </code>
            <Badge variant="outline">{getSourceLabel(storageConfig?.source || 'default')}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Available Drives */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            Unidades Disponiveis
          </CardTitle>
          <CardDescription>
            Clique em uma unidade para usar como sugestao de caminho
          </CardDescription>
        </CardHeader>
        <CardContent>
          {drivesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
            </div>
          ) : drives && drives.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Livre</TableHead>
                  <TableHead>Uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drives.map((drive) => (
                  <TableRow
                    key={drive.letter}
                    className="cursor-pointer hover:bg-neutral-50"
                    onClick={() => handleDriveClick(drive)}
                  >
                    <TableCell className="font-mono font-medium">{drive.letter}</TableCell>
                    <TableCell>{drive.label}</TableCell>
                    <TableCell>{getDriveTypeBadge(drive.type)}</TableCell>
                    <TableCell className="text-right">{drive.totalGB.toFixed(1)} GB</TableCell>
                    <TableCell className="text-right">{drive.freeGB.toFixed(1)} GB</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={drive.usedPercent} className="h-2 flex-1" />
                        <span className={`text-xs font-medium ${getUsageColor(drive.usedPercent)}`}>
                          {drive.usedPercent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-neutral-500 py-4 text-center">
              Nenhuma unidade encontrada
            </p>
          )}
        </CardContent>
      </Card>

      {/* Configure Path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Configurar Caminho
          </CardTitle>
          <CardDescription>
            Informe o caminho completo onde os arquivos serao armazenados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: D:\EnlevoHub\storage ou \\servidor\share\storage"
              value={customPath}
              onChange={(e) => {
                setCustomPath(e.target.value)
                setTestResult(null)
                setPathTested(false)
              }}
              className="flex-1 font-mono"
            />
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={isTesting || !customPath.trim()}
            >
              {isTesting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FlaskConical className="mr-2 h-4 w-4" />
              )}
              Testar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !pathTested}
            >
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar
            </Button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div
              className={`flex items-start gap-3 rounded-lg border p-4 ${
                testResult.success
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {testResult.message}
                </p>
                {testResult.freeGB !== undefined && (
                  <p className="text-sm text-green-700 mt-1">
                    Espaco livre: {testResult.freeGB.toFixed(1)} GB
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">Atencao</p>
              <p className="text-sm text-amber-700 mt-1">
                Ao mudar o caminho, arquivos existentes NAO sao movidos automaticamente.
                Mova manualmente os arquivos da pasta antiga para a nova antes de salvar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
