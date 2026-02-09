import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Save, Send, Eye, EyeOff, Info } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { tenantAPI } from '@/lib/api-client'

const smtpSchema = z.object({
  host: z.string().min(1, 'Host e obrigatorio'),
  port: z.coerce.number().min(1).max(65535, 'Porta invalida'),
  secure: z.boolean(),
  user: z.string().min(1, 'Usuario e obrigatorio'),
  password: z.string().min(1, 'Senha e obrigatoria'),
  fromName: z.string().min(1, 'Nome do remetente e obrigatorio'),
  fromEmail: z.string().email('Email do remetente invalido'),
})

type SmtpFormData = z.infer<typeof smtpSchema>

export function EmailSettings() {
  const queryClient = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [testDialogOpen, setTestDialogOpen] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)

  const { data: settings, isLoading } = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: () => tenantAPI.getSettings() as Promise<any>,
  })

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<SmtpFormData>({
    resolver: zodResolver(smtpSchema),
    values: settings?.smtp
      ? {
          host: settings.smtp.host || '',
          port: settings.smtp.port || 587,
          secure: settings.smtp.secure ?? false,
          user: settings.smtp.user || '',
          password: settings.smtp.password || '',
          fromName: settings.smtp.fromName || '',
          fromEmail: settings.smtp.fromEmail || '',
        }
      : {
          host: '',
          port: 587,
          secure: false,
          user: '',
          password: '',
          fromName: '',
          fromEmail: '',
        },
  })

  const secureValue = watch('secure')

  const saveMutation = useMutation({
    mutationFn: (data: SmtpFormData) => tenantAPI.updateSettings({ smtp: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings'] })
      toast.success('Configuracoes SMTP salvas com sucesso')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao salvar configuracoes')
    },
  })

  const onSubmit = (data: SmtpFormData) => {
    saveMutation.mutate(data)
  }

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Informe um email de destino')
      return
    }
    setIsSendingTest(true)
    try {
      await tenantAPI.sendTestEmail(testEmail)
      toast.success('Email de teste enviado com sucesso')
      setTestDialogOpen(false)
      setTestEmail('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar email de teste')
    } finally {
      setIsSendingTest(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Configuracoes de Email</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Configure o servidor SMTP para envio de emails (redefinicao de senha, notificacoes, etc.)
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Servidor SMTP</CardTitle>
            <CardDescription>
              Credenciais do servidor de email para envio de mensagens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Row 1: Host + Port + Security */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="host">Host SMTP</Label>
                <Input
                  id="host"
                  placeholder="smtp.gmail.com"
                  {...register('host')}
                />
                {errors.host && (
                  <p className="text-sm text-error-600">{errors.host.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="port">Porta</Label>
                <Input
                  id="port"
                  type="number"
                  placeholder="587"
                  {...register('port')}
                />
                {errors.port && (
                  <p className="text-sm text-error-600">{errors.port.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Seguranca</Label>
                <Select
                  value={secureValue ? 'tls' : 'starttls'}
                  onValueChange={(value) => setValue('secure', value === 'tls', { shouldDirty: true })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starttls">STARTTLS (587)</SelectItem>
                    <SelectItem value="tls">TLS/SSL (465)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: User + Password */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="user">Usuario</Label>
                <Input
                  id="user"
                  placeholder="noreply@suaempresa.com.br"
                  {...register('user')}
                />
                {errors.user && (
                  <p className="text-sm text-error-600">{errors.user.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Senha ou App Password"
                    {...register('password')}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-sm text-error-600">{errors.password.message}</p>
                )}
              </div>
            </div>

            {/* Row 3: From Name + From Email */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fromName">Nome do Remetente</Label>
                <Input
                  id="fromName"
                  placeholder="Enlevo Engenharia"
                  {...register('fromName')}
                />
                {errors.fromName && (
                  <p className="text-sm text-error-600">{errors.fromName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromEmail">Email do Remetente</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="noreply@suaempresa.com.br"
                  {...register('fromEmail')}
                />
                {errors.fromEmail && (
                  <p className="text-sm text-error-600">{errors.fromEmail.message}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={saveMutation.isPending || !isDirty}>
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Salvar Configuracoes
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTestDialogOpen(true)}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar Email de Teste
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Google Workspace Tip */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="flex gap-3 pt-6">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">Google Workspace</h3>
            <p className="mt-1 text-sm text-blue-700">
              Para usar com Google Workspace, configure:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700">
              <li><strong>Host:</strong> smtp.gmail.com</li>
              <li><strong>Porta:</strong> 587 (STARTTLS) ou 465 (TLS/SSL)</li>
              <li><strong>Usuario:</strong> seu email (ex: noreply@suaempresa.com.br)</li>
              <li><strong>Senha:</strong> Use uma <strong>Senha de App</strong> (Google Admin {'>'} Seguranca {'>'} Senhas de app)</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Test Email Dialog */}
      <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Email de Teste</DialogTitle>
            <DialogDescription>
              Informe o email de destino para testar as configuracoes SMTP.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="testEmail">Email de destino</Label>
            <Input
              id="testEmail"
              type="email"
              placeholder="seu@email.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTestDialogOpen(false)}
              disabled={isSendingTest}
            >
              Cancelar
            </Button>
            <Button onClick={handleSendTestEmail} disabled={isSendingTest || !testEmail}>
              {isSendingTest ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
