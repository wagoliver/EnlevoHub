import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authAPI } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth.store'
import { EnlevoLogo } from '@/components/EnlevoLogo'

const registerSchema = z.object({
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

type RegisterFormData = z.infer<typeof registerSchema>

export function Register() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormData) => {
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

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Brand */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-[#21252d] px-12">
        <EnlevoLogo variant="light" size="lg" />
        <p className="mt-6 text-center text-white/60 text-lg font-light max-w-sm">
          Gestão inteligente de obras com elegância e eficiência
        </p>
      </div>

      {/* Right Panel — Form */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 text-center md:hidden">
            <EnlevoLogo size="md" />
          </div>

          <h2 className="text-2xl font-semibold text-neutral-900">Criar Conta</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Crie sua conta e comece a gerenciar suas obras
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                placeholder="João Silva"
                {...register('name')}
                disabled={isLoading}
              />
              {errors.name && (
                <p className="text-sm text-error-600">{errors.name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                disabled={isLoading}
              />
              {errors.password && (
                <p className="text-sm text-error-600">{errors.password.message}</p>
              )}
              <p className="text-xs text-neutral-500">
                Mínimo 8 caracteres, com maiúscula, minúscula e número
              </p>
            </div>

            {/* Tenant Name */}
            <div className="space-y-2">
              <Label htmlFor="tenantName">Nome da Empresa</Label>
              <Input
                id="tenantName"
                type="text"
                placeholder="Construtora ABC"
                {...register('tenantName')}
                disabled={isLoading}
              />
              {errors.tenantName && (
                <p className="text-sm text-error-600">{errors.tenantName.message}</p>
              )}
            </div>

            {/* Tenant Document */}
            <div className="space-y-2">
              <Label htmlFor="tenantDocument">CNPJ/CPF</Label>
              <Input
                id="tenantDocument"
                type="text"
                placeholder="00.000.000/0000-00"
                {...register('tenantDocument')}
                disabled={isLoading}
              />
              {errors.tenantDocument && (
                <p className="text-sm text-error-600">{errors.tenantDocument.message}</p>
              )}
            </div>

            {/* Submit Button */}
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

          {/* Login Link */}
          <div className="mt-8 text-center text-sm">
            <span className="text-neutral-600">Já tem uma conta? </span>
            <Link
              to="/login"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              Entrar
            </Link>
          </div>

          {/* Footer */}
          <p className="mt-10 text-center text-xs text-neutral-400">
            &copy; 2026 EnlevoHub. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
