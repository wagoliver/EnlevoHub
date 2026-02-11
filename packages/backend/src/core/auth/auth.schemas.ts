import { z } from 'zod'

// Register schema
export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  tenantName: z.string().min(2, 'Company name must be at least 2 characters'),
  tenantDocument: z.string().min(11, 'Document must be at least 11 characters')
})

export type RegisterSchema = z.infer<typeof registerSchema>

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

export type LoginSchema = z.infer<typeof loginSchema>

// Refresh token schema
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
})

export type RefreshTokenSchema = z.infer<typeof refreshTokenSchema>

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
})

export type ChangePasswordSchema = z.infer<typeof changePasswordSchema>

// Register contractor schema
export const registerContractorSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  tenantDocument: z.string().min(11, 'CNPJ da empresa é obrigatório'),
  document: z.string().min(11, 'CPF/CNPJ do empreiteiro é obrigatório'),
  specialty: z.array(z.string()).min(1, 'Pelo menos uma especialidade é obrigatória'),
  contacts: z.any(),
})

export type RegisterContractorSchema = z.infer<typeof registerContractorSchema>

// Register broker schema
export const registerBrokerSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  tenantDocument: z.string().min(11, 'CNPJ da empresa é obrigatório'),
  document: z.string().min(11, 'CPF do corretor é obrigatório'),
  creci: z.string().optional(),
  phone: z.string().optional(),
})

export type RegisterBrokerSchema = z.infer<typeof registerBrokerSchema>

// Update profile schema
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').optional(),
  email: z.string().email('Email inválido').optional(),
})

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
})

export type ForgotPasswordSchema = z.infer<typeof forgotPasswordSchema>

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token é obrigatório'),
  newPassword: z
    .string()
    .min(8, 'Senha deve ter pelo menos 8 caracteres')
    .regex(/[A-Z]/, 'Senha deve conter pelo menos uma letra maiúscula')
    .regex(/[a-z]/, 'Senha deve conter pelo menos uma letra minúscula')
    .regex(/[0-9]/, 'Senha deve conter pelo menos um número'),
})

export type ResetPasswordSchema = z.infer<typeof resetPasswordSchema>
