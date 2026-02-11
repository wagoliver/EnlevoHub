import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, User, Building2, Pencil, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authAPI } from '@/lib/api-client'
import { useAuthStore, Role } from '@/stores/auth.store'

const ROLE_LABELS: Record<Role, string> = {
  ROOT: 'Root',
  MASTER: 'Gestor',
  ENGINEER: 'Engenheiro',
  ADMIN_STAFF: 'Administrativo',
  CONTRACTOR: 'Empreiteiro',
  BROKER: 'Corretor',
  VIEWER: 'Visualizador',
}

const ROLE_COLORS: Record<Role, string> = {
  ROOT: 'bg-red-100 text-red-700',
  MASTER: 'bg-purple-100 text-purple-700',
  ENGINEER: 'bg-blue-100 text-blue-700',
  ADMIN_STAFF: 'bg-amber-100 text-amber-700',
  CONTRACTOR: 'bg-green-100 text-green-700',
  BROKER: 'bg-teal-100 text-teal-700',
  VIEWER: 'bg-neutral-100 text-neutral-700',
}

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Gratuito',
  BASIC: 'Básico',
  PRO: 'Pro',
  ENTERPRISE: 'Empresarial',
}

const PLAN_COLORS: Record<string, string> = {
  FREE: 'bg-neutral-100 text-neutral-700',
  BASIC: 'bg-blue-100 text-blue-700',
  PRO: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
}

interface ProfileData {
  id: string
  email: string
  name: string
  role: Role
  tenantId: string
  contractorId?: string | null
  isApproved: boolean
  createdAt: string
  tenant: {
    id: string
    name: string
    plan: string
  }
  contractor?: {
    id: string
    name: string
    document: string
    specialty: string[]
  } | null
}

const profileFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
  newPassword: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Deve conter pelo menos um número'),
  confirmPassword: z.string().min(1, 'Confirmação de senha é obrigatória'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'As senhas não coincidem',
  path: ['confirmPassword'],
})

type PasswordFormValues = z.infer<typeof passwordFormSchema>

function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

export function Profile() {
  const queryClient = useQueryClient()
  const { updateUser } = useAuthStore()

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => authAPI.getMe() as Promise<ProfileData>,
  })

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    values: profile ? { name: profile.name, email: profile.email } : undefined,
  })

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string }) =>
      authAPI.updateProfile(data) as Promise<ProfileData>,
    onSuccess: (data) => {
      updateUser({ name: data.name, email: data.email })
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Perfil atualizado com sucesso')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const changePasswordMutation = useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      authAPI.changePassword(data.currentPassword, data.newPassword),
    onSuccess: () => {
      passwordForm.reset()
      toast.success('Senha alterada com sucesso')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const onProfileSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data)
  }

  const onPasswordSubmit = (data: PasswordFormValues) => {
    changePasswordMutation.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    })
  }

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Meu Perfil</h1>
        <p className="text-sm text-neutral-500">
          Gerencie suas informações pessoais e senha
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Card 1 - Informações Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-bold text-white">
                {getInitials(profile.name)}
              </div>
              <div>
                <p className="text-lg font-semibold text-neutral-900">
                  {profile.name}
                </p>
                <p className="text-sm text-neutral-500">{profile.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${ROLE_COLORS[profile.role]}`}
              >
                {ROLE_LABELS[profile.role] || profile.role}
              </span>
            </div>
            <div className="text-sm text-neutral-500">
              Membro desde{' '}
              {new Date(profile.createdAt).toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </div>
          </CardContent>
        </Card>

        {/* Card 2 - Empresa & Conta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5" />
              Empresa & Conta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-neutral-500">Empresa</p>
              <p className="font-medium text-neutral-900">
                {profile.tenant.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div>
                <p className="text-sm text-neutral-500">Plano</p>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${PLAN_COLORS[profile.tenant.plan] || PLAN_COLORS.FREE}`}
                >
                  {PLAN_LABELS[profile.tenant.plan] || profile.tenant.plan}
                </span>
              </div>
              <div>
                <p className="text-sm text-neutral-500">Status</p>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                    profile.isApproved
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {profile.isApproved ? 'Aprovado' : 'Pendente'}
                </span>
              </div>
            </div>
            {profile.contractor && (
              <div className="border-t pt-4">
                <p className="text-sm font-medium text-neutral-700 mb-2">
                  Dados do Empreiteiro
                </p>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-neutral-500">Documento</p>
                    <p className="text-sm font-medium text-neutral-900">
                      {profile.contractor.document}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Especialidades</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {profile.contractor.specialty.map((s) => (
                        <span
                          key={s}
                          className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Card 3 - Editar Perfil */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Pencil className="h-5 w-5" />
            Editar Perfil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  {...profileForm.register('name')}
                  placeholder="Seu nome"
                />
                {profileForm.formState.errors.name && (
                  <p className="text-xs text-red-500">
                    {profileForm.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...profileForm.register('email')}
                  placeholder="seu@email.com"
                />
                {profileForm.formState.errors.email && (
                  <p className="text-xs text-red-500">
                    {profileForm.formState.errors.email.message}
                  </p>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending || !profileForm.formState.isDirty}
              >
                {updateProfileMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Card 4 - Alterar Senha */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5" />
            Alterar Senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="currentPassword">Senha Atual</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  {...passwordForm.register('currentPassword')}
                  placeholder="Sua senha atual"
                />
                {passwordForm.formState.errors.currentPassword && (
                  <p className="text-xs text-red-500">
                    {passwordForm.formState.errors.currentPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="newPassword">Nova Senha</Label>
                <Input
                  id="newPassword"
                  type="password"
                  {...passwordForm.register('newPassword')}
                  placeholder="Nova senha"
                />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-red-500">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  {...passwordForm.register('confirmPassword')}
                  placeholder="Confirme a nova senha"
                />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-red-500">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              Mínimo 8 caracteres, com maiúscula, minúscula e número
            </p>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Alterar Senha
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
