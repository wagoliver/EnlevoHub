import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle, Building2, HardHat, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authAPI } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import { EnlevoLogo } from '@/components/EnlevoLogo'
import { cn } from '@/lib/utils'

type AccountType = 'company' | 'contractor'

const companySchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  tenantName: z.string().min(2, 'Nome da empresa deve ter no mínimo 2 caracteres'),
  tenantDocument: z.string().min(11, 'Documento deve ter no mínimo 11 caracteres'),
})

const contractorSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  tenantDocument: z.string().min(11, 'CNPJ da empresa é obrigatório'),
  document: z.string().min(11, 'CPF/CNPJ do empreiteiro é obrigatório'),
  specialty: z.string().min(1, 'Pelo menos uma especialidade é obrigatória'),
  phone: z.string().optional(),
})

type CompanyFormData = z.infer<typeof companySchema>
type ContractorFormData = z.infer<typeof contractorSchema>

export function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [accountType, setAccountType] = useState<AccountType>('company')
  const [contractorSuccess, setContractorSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const companyForm = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
  })

  const contractorForm = useForm<ContractorFormData>({
    resolver: zodResolver(contractorSchema),
  })

  const onSubmitCompany = async (data: CompanyFormData) => {
    setIsLoading(true)
    try {
      const response = await authAPI.register(data) as any
      setAuth(response)
      toast.success('Cadastro realizado com sucesso!')
      navigate('/')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer cadastro')
    } finally {
      setIsLoading(false)
    }
  }

  const onSubmitContractor = async (data: ContractorFormData) => {
    setIsLoading(true)
    try {
      await authAPI.registerContractor({
        email: data.email,
        password: data.password,
        name: data.name,
        tenantDocument: data.tenantDocument,
        document: data.document,
        specialty: data.specialty.split(',').map(s => s.trim()),
        contacts: data.phone ? { phone: data.phone } : {},
      })
      setContractorSuccess(true)
      toast.success('Cadastro realizado com sucesso!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao realizar cadastro')
    } finally {
      setIsLoading(false)
    }
  }

  if (contractorSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="mb-6">
            <EnlevoLogo size="md" />
          </div>
          <div className="rounded-lg bg-white p-8 shadow-sm border border-neutral-200">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-semibold text-neutral-900">Cadastro Realizado!</h2>
            <p className="mt-3 text-neutral-600">
              Seu cadastro como empreiteiro foi enviado com sucesso.
            </p>
            <p className="mt-2 text-neutral-600">
              Aguarde a aprovação da empresa para acessar o sistema.
            </p>
            <Link to="/login">
              <Button className="mt-6 w-full">Voltar para Login</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Brand */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-[#21252d] px-12">
        <EnlevoLogo variant="light" size="lg" />
        <p className="mt-6 text-center text-white/60 text-lg font-light max-w-sm">
          Construa com inteligência. Entregue com velocidade.
        </p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center bg-white px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 text-center md:hidden">
            <EnlevoLogo size="md" />
          </div>

          <h2 className="text-2xl font-semibold text-neutral-900">Criar Conta</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Selecione o tipo de conta e preencha seus dados
          </p>

          {/* Account Type Selector */}
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setAccountType('company')}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                accountType === 'company'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
              )}
            >
              <Building2 className="h-6 w-6" />
              <span className="text-sm font-medium">Gestor</span>
            </button>
            <button
              type="button"
              onClick={() => setAccountType('contractor')}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all',
                accountType === 'contractor'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300'
              )}
            >
              <HardHat className="h-6 w-6" />
              <span className="text-sm font-medium">Empreiteiro</span>
            </button>
          </div>

          {/* Company Form */}
          {accountType === 'company' && (
            <form onSubmit={companyForm.handleSubmit(onSubmitCompany)} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="company-name">Nome Completo</Label>
                <Input
                  id="company-name"
                  type="text"
                  placeholder="João Silva"
                  {...companyForm.register('name')}
                  disabled={isLoading}
                />
                {companyForm.formState.errors.name && (
                  <p className="text-sm text-error-600">{companyForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company-email">Email</Label>
                <Input
                  id="company-email"
                  type="email"
                  placeholder="seu@email.com"
                  {...companyForm.register('email')}
                  disabled={isLoading}
                />
                {companyForm.formState.errors.email && (
                  <p className="text-sm text-error-600">{companyForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="company-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 caracteres"
                    {...companyForm.register('password')}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {companyForm.formState.errors.password && (
                  <p className="text-sm text-error-600">{companyForm.formState.errors.password.message}</p>
                )}
                <p className="text-xs text-neutral-500">
                  Mínimo 8 caracteres, com maiúscula, minúscula e número
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company-tenantName">Nome da Empresa</Label>
                <Input
                  id="company-tenantName"
                  type="text"
                  placeholder="Construtora ABC"
                  {...companyForm.register('tenantName')}
                  disabled={isLoading}
                />
                {companyForm.formState.errors.tenantName && (
                  <p className="text-sm text-error-600">{companyForm.formState.errors.tenantName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="company-tenantDocument">CNPJ/CPF da Empresa</Label>
                <Input
                  id="company-tenantDocument"
                  type="text"
                  placeholder="00.000.000/0000-00"
                  {...companyForm.register('tenantDocument')}
                  disabled={isLoading}
                />
                {companyForm.formState.errors.tenantDocument && (
                  <p className="text-sm text-error-600">{companyForm.formState.errors.tenantDocument.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando conta...
                  </>
                ) : (
                  'Criar Conta'
                )}
              </Button>
            </form>
          )}

          {/* Contractor Form */}
          {accountType === 'contractor' && (
            <form onSubmit={contractorForm.handleSubmit(onSubmitContractor)} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="contractor-name">Nome Completo</Label>
                <Input
                  id="contractor-name"
                  placeholder="Seu nome"
                  {...contractorForm.register('name')}
                  disabled={isLoading}
                />
                {contractorForm.formState.errors.name && (
                  <p className="text-sm text-error-600">{contractorForm.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contractor-email">Email</Label>
                <Input
                  id="contractor-email"
                  type="email"
                  placeholder="seu@email.com"
                  {...contractorForm.register('email')}
                  disabled={isLoading}
                />
                {contractorForm.formState.errors.email && (
                  <p className="text-sm text-error-600">{contractorForm.formState.errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contractor-password">Senha</Label>
                <div className="relative">
                  <Input
                    id="contractor-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Min. 8 caracteres"
                    {...contractorForm.register('password')}
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {contractorForm.formState.errors.password && (
                  <p className="text-sm text-error-600">{contractorForm.formState.errors.password.message}</p>
                )}
                <p className="text-xs text-neutral-500">
                  Mínimo 8 caracteres, com maiúscula, minúscula e número
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contractor-tenantDocument">CNPJ da Empresa (Construtora)</Label>
                <Input
                  id="contractor-tenantDocument"
                  placeholder="00.000.000/0001-00"
                  {...contractorForm.register('tenantDocument')}
                  disabled={isLoading}
                />
                {contractorForm.formState.errors.tenantDocument && (
                  <p className="text-sm text-error-600">{contractorForm.formState.errors.tenantDocument.message}</p>
                )}
                <p className="text-xs text-neutral-500">
                  Informe o CNPJ da construtora para vincular sua conta
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contractor-document">Seu CPF/CNPJ</Label>
                <Input
                  id="contractor-document"
                  placeholder="000.000.000-00"
                  {...contractorForm.register('document')}
                  disabled={isLoading}
                />
                {contractorForm.formState.errors.document && (
                  <p className="text-sm text-error-600">{contractorForm.formState.errors.document.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contractor-specialty">Especialidades</Label>
                <Input
                  id="contractor-specialty"
                  placeholder="Ex: Alvenaria, Elétrica, Hidráulica"
                  {...contractorForm.register('specialty')}
                  disabled={isLoading}
                />
                <p className="text-xs text-neutral-400">Separe com vírgulas</p>
                {contractorForm.formState.errors.specialty && (
                  <p className="text-sm text-error-600">{contractorForm.formState.errors.specialty.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contractor-phone">Telefone (opcional)</Label>
                <Input
                  id="contractor-phone"
                  placeholder="(00) 00000-0000"
                  {...contractorForm.register('phone')}
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  'Solicitar Cadastro'
                )}
              </Button>
            </form>
          )}

          {/* Login Link */}
          <div className="mt-6 text-center text-sm">
            <span className="text-neutral-600">Já tem uma conta? </span>
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              Entrar
            </Link>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-neutral-400">
            &copy; 2026 EnlevoHub. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
