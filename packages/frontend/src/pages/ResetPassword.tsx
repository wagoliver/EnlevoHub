import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authAPI } from '@/lib/api-client'
import { EnlevoLogo } from '@/components/EnlevoLogo'

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Senha deve ter pelo menos 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter pelo menos uma letra maiuscula')
      .regex(/[a-z]/, 'Deve conter pelo menos uma letra minuscula')
      .regex(/[0-9]/, 'Deve conter pelo menos um numero'),
    confirmPassword: z.string().min(1, 'Confirme a senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas nao coincidem',
    path: ['confirmPassword'],
  })

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>

export function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  })

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return
    setIsLoading(true)
    try {
      await authAPI.resetPassword(token, data.newPassword)
      setIsSuccess(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao redefinir senha')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left Panel */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-[#21252d] px-12">
        <EnlevoLogo variant="light" size="lg" />
        <p className="mt-6 text-center text-white/60 text-lg font-light max-w-sm">
          Gestao inteligente de obras com elegancia e eficiencia
        </p>
      </div>

      {/* Right Panel */}
      <div className="flex w-full md:w-1/2 flex-col items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-8 text-center md:hidden">
            <EnlevoLogo size="md" />
          </div>

          {!token ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-neutral-900 text-center">
                Link invalido
              </h2>
              <p className="mt-3 text-sm text-neutral-500 text-center">
                Este link de redefinicao de senha e invalido ou expirou. Solicite um novo link.
              </p>
              <Link
                to="/forgot-password"
                className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Solicitar novo link
              </Link>
            </>
          ) : isSuccess ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-neutral-900 text-center">
                Senha redefinida
              </h2>
              <p className="mt-3 text-sm text-neutral-500 text-center">
                Sua senha foi redefinida com sucesso. Voce ja pode fazer login com a nova senha.
              </p>
              <Link
                to="/login"
                className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                Ir para login
              </Link>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <ShieldCheck className="h-8 w-8 text-primary-600" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-neutral-900 text-center">
                Redefinir senha
              </h2>
              <p className="mt-1 text-sm text-neutral-500 text-center">
                Crie uma nova senha para sua conta
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nova senha</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Minimo 8 caracteres"
                    {...register('newPassword')}
                    disabled={isLoading}
                  />
                  {errors.newPassword && (
                    <p className="text-sm text-error-600">{errors.newPassword.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repita a nova senha"
                    {...register('confirmPassword')}
                    disabled={isLoading}
                  />
                  {errors.confirmPassword && (
                    <p className="text-sm text-error-600">{errors.confirmPassword.message}</p>
                  )}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redefinindo...
                    </>
                  ) : (
                    'Redefinir senha'
                  )}
                </Button>
              </form>

              <Link
                to="/login"
                className="mt-6 flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </Link>
            </>
          )}

          <p className="mt-10 text-center text-xs text-neutral-400">
            &copy; 2026 EnlevoHub. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  )
}
