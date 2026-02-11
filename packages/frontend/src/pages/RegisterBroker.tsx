import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authAPI } from '@/lib/api-client'
import { EnlevoLogo } from '@/components/EnlevoLogo'

const registerBrokerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  tenantDocument: z.string().min(11, 'CNPJ da empresa é obrigatório'),
  document: z.string().min(11, 'CPF do corretor é obrigatório'),
  creci: z.string().optional(),
  phone: z.string().optional(),
})

type RegisterBrokerFormData = z.infer<typeof registerBrokerSchema>

export function RegisterBroker() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterBrokerFormData>({
    resolver: zodResolver(registerBrokerSchema),
  })

  const onSubmit = async (data: RegisterBrokerFormData) => {
    setIsLoading(true)
    try {
      await authAPI.registerBroker({
        email: data.email,
        password: data.password,
        name: data.name,
        tenantDocument: data.tenantDocument,
        document: data.document,
        creci: data.creci || undefined,
        phone: data.phone || undefined,
      })
      setIsSuccess(true)
      toast.success('Cadastro realizado com sucesso!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao realizar cadastro')
    } finally {
      setIsLoading(false)
    }
  }

  if (isSuccess) {
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
              Seu cadastro como corretor foi enviado com sucesso.
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
      {/* Left Panel */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-[#21252d] px-12">
        <EnlevoLogo variant="light" size="lg" />
        <p className="mt-6 text-center text-white/60 text-lg font-light max-w-sm">
          Cadastro de Corretor
        </p>
        <p className="mt-2 text-center text-white/40 text-sm max-w-xs">
          Informe o CNPJ da empresa incorporadora para vincular sua conta
        </p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center bg-white px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 text-center md:hidden">
            <EnlevoLogo size="md" />
          </div>

          <h2 className="text-2xl font-semibold text-neutral-900">Cadastro de Corretor</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Preencha seus dados para solicitar acesso ao sistema
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                placeholder="Seu nome"
                {...register('name')}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-error-600">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                {...register('email')}
                disabled={isLoading}
              />
              {errors.email && (
                <p className="text-sm text-error-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min. 8 caracteres"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-error-600">{errors.password.message}</p>
              )}
            </div>

            {/* Tenant Document (CNPJ da empresa) */}
            <div className="space-y-1.5">
              <Label htmlFor="tenantDocument">CNPJ da Empresa (Incorporadora)</Label>
              <Input
                id="tenantDocument"
                placeholder="00.000.000/0001-00"
                {...register('tenantDocument')}
                disabled={isLoading}
              />
              {errors.tenantDocument && (
                <p className="text-sm text-error-600">{errors.tenantDocument.message}</p>
              )}
            </div>

            {/* Document (CPF do corretor) */}
            <div className="space-y-1.5">
              <Label htmlFor="document">Seu CPF</Label>
              <Input
                id="document"
                placeholder="000.000.000-00"
                {...register('document')}
                disabled={isLoading}
              />
              {errors.document && (
                <p className="text-sm text-error-600">{errors.document.message}</p>
              )}
            </div>

            {/* CRECI */}
            <div className="space-y-1.5">
              <Label htmlFor="creci">CRECI (opcional)</Label>
              <Input
                id="creci"
                placeholder="Ex: 12345-F"
                {...register('creci')}
                disabled={isLoading}
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                {...register('phone')}
                disabled={isLoading}
              />
            </div>

            {/* Submit */}
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

          <p className="mt-8 text-center text-xs text-neutral-400">
            &copy; 2026 EnlevoHub. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
