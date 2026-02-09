import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authAPI } from '@/lib/api-client'
import { EnlevoLogo } from '@/components/EnlevoLogo'

const forgotPasswordSchema = z.object({
  email: z.string().email('Email invalido'),
})

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>

export function ForgotPassword() {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  })

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true)
    try {
      await authAPI.forgotPassword(data.email)
      setIsSubmitted(true)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao enviar solicitacao')
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

          {isSubmitted ? (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-neutral-900 text-center">
                Verifique seu email
              </h2>
              <p className="mt-3 text-sm text-neutral-500 text-center">
                Se o email estiver cadastrado, voce recebera um link para redefinir sua senha. Verifique tambem a pasta de spam.
              </p>
              <Link
                to="/login"
                className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao login
              </Link>
            </>
          ) : (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <Mail className="h-8 w-8 text-primary-600" />
                </div>
              </div>
              <h2 className="text-2xl font-semibold text-neutral-900 text-center">
                Esqueci minha senha
              </h2>
              <p className="mt-1 text-sm text-neutral-500 text-center">
                Informe seu email e enviaremos um link para redefinir sua senha
              </p>

              <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
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

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar link de redefinicao'
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
