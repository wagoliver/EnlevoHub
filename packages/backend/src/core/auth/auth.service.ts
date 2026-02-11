import crypto from 'crypto'
import bcrypt from 'bcrypt'
import { PrismaClient, User, Tenant } from '@prisma/client'
import { JWTService, TokenPair } from './jwt.service'
import { EmailService } from '../email'
import { seedDefaultTemplate } from '../../modules/activity-templates/default-template.seed'

const SALT_ROUNDS = 12

export interface RegisterInput {
  email: string
  password: string
  name: string
  tenantName: string
  tenantDocument: string
}

export interface RegisterContractorInput {
  email: string
  password: string
  name: string
  tenantDocument: string
  document: string
  specialty: string[]
  contacts?: any
}

export interface LoginInput {
  email: string
  password: string
}

export interface UpdateProfileInput {
  name?: string
  email?: string
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    name: string
    role: string
    tenantId: string
    contractorId?: string | null
    isApproved: boolean
  }
  tenant: {
    id: string
    name: string
    plan: string
  }
  tokens: TokenPair
}

export class AuthService {
  private emailService: EmailService

  constructor(
    private prisma: PrismaClient,
    private jwtService: JWTService
  ) {
    this.emailService = new EmailService(prisma)
  }

  /**
   * Register new user and tenant
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email }
    })

    if (existingUser) {
      throw new Error('User with this email already exists')
    }

    // Check if tenant document already exists
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { document: input.tenantDocument }
    })

    if (existingTenant) {
      throw new Error('Tenant with this document already exists')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS)

    // Create tenant and user in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: input.tenantName,
          document: input.tenantDocument,
          plan: 'FREE',
          settings: {}
        }
      })

      // Create user (MASTER of the tenant)
      const user = await tx.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          name: input.name,
          role: 'MASTER',
          tenantId: tenant.id,
          isApproved: true,
          permissions: {}
        }
      })

      // Seed default activity template for the new tenant
      try {
        await seedDefaultTemplate(tx as any, tenant.id)
      } catch (err) {
        console.warn('Failed to seed default template (non-blocking):', err)
      }

      return { user, tenant }
    })

    // Generate tokens
    const tokens = await this.jwtService.generateTokens({
      userId: result.user.id,
      tenantId: result.tenant.id,
      email: result.user.email,
      role: result.user.role
    })

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
        role: result.user.role,
        tenantId: result.tenant.id,
        contractorId: null,
        isApproved: true
      },
      tenant: {
        id: result.tenant.id,
        name: result.tenant.name,
        plan: result.tenant.plan
      },
      tokens
    }
  }

  /**
   * Register contractor (auto-cadastro)
   */
  async registerContractor(input: RegisterContractorInput): Promise<{ message: string }> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email }
    })

    if (existingUser) {
      throw new Error('Já existe um usuário com este email')
    }

    // Find tenant by document (CNPJ)
    const tenant = await this.prisma.tenant.findUnique({
      where: { document: input.tenantDocument }
    })

    if (!tenant) {
      throw new Error('Empresa não encontrada. Verifique o CNPJ informado.')
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(input.password, SALT_ROUNDS)

    // Create contractor and user in transaction
    await this.prisma.$transaction(async (tx) => {
      // Create contractor
      const contractor = await tx.contractor.create({
        data: {
          tenantId: tenant.id,
          name: input.name,
          document: input.document,
          specialty: input.specialty,
          contacts: input.contacts || {},
          isActive: true,
        }
      })

      // Create user with role CONTRACTOR, isApproved = false
      await tx.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          name: input.name,
          role: 'CONTRACTOR',
          tenantId: tenant.id,
          contractorId: contractor.id,
          isApproved: false,
          permissions: {}
        }
      })
    })

    return { message: 'Cadastro realizado com sucesso. Aguardando aprovação da empresa.' }
  }

  /**
   * Login user
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { tenant: true }
    })

    if (!user) {
      throw new Error('Email ou senha inválidos')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, user.password)

    if (!isValidPassword) {
      throw new Error('Email ou senha inválidos')
    }

    // Check if user is approved
    if (!user.isApproved) {
      throw new Error('Conta pendente de aprovação. Aguarde a aprovação da empresa.')
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error('Conta desativada. Entre em contato com o administrador.')
    }

    // Generate tokens
    const tokens = await this.jwtService.generateTokens({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      contractorId: user.contractorId || undefined
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        contractorId: user.contractorId,
        isApproved: user.isApproved
      },
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        plan: user.tenant.plan
      },
      tokens
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<TokenPair> {
    // Verify refresh token
    const decoded = await this.jwtService.verifyRefreshToken(refreshToken)

    // Get user
    const user = await this.prisma.user.findUnique({
      where: { id: decoded.userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Generate new tokens
    const tokens = await this.jwtService.generateTokens({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role,
      contractorId: user.contractorId || undefined
    })

    return tokens
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            plan: true
          }
        },
        contractor: {
          select: {
            id: true,
            name: true,
            document: true,
            specialty: true
          }
        }
      }
    })

    if (!user) {
      throw new Error('User not found')
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
      contractorId: user.contractorId,
      isApproved: user.isApproved,
      createdAt: user.createdAt,
      tenant: user.tenant,
      contractor: user.contractor || null
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId: string, input: UpdateProfileInput) {
    if (input.email) {
      const existing = await this.prisma.user.findFirst({
        where: { email: input.email, NOT: { id: userId } }
      })
      if (existing) {
        throw new Error('Já existe um usuário com este email')
      }
    }

    const data: any = {}
    if (input.name !== undefined) data.name = input.name
    if (input.email !== undefined) data.email = input.email

    await this.prisma.user.update({
      where: { id: userId },
      data
    })

    return this.getUserById(userId)
  }

  /**
   * Change password
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)

    if (!isValidPassword) {
      throw new Error('Current password is incorrect')
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })
  }

  /**
   * Forgot password - sends reset email
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericMessage = 'Se o email estiver cadastrado, você receberá um link para redefinir sua senha.'

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { tenant: true },
    })

    if (!user) {
      return { message: genericMessage }
    }

    const smtp = await this.emailService.getSmtpSettings(user.tenantId)
    if (!smtp) {
      return { message: genericMessage }
    }

    // Invalidate previous unused tokens
    await this.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    })

    // Generate token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    })

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const resetLink = `${frontendUrl}/reset-password?token=${token}`

    try {
      await this.emailService.sendPasswordResetEmail(
        user.email,
        resetLink,
        user.tenant.name,
        smtp
      )
    } catch (error) {
      console.error('Failed to send password reset email:', error)
    }

    return { message: genericMessage }
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    })

    if (!resetToken) {
      throw new Error('Token inválido ou expirado')
    }

    if (resetToken.usedAt) {
      throw new Error('Este link já foi utilizado')
    }

    if (resetToken.expiresAt < new Date()) {
      throw new Error('Este link expirou. Solicite um novo.')
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ])

    return { message: 'Senha redefinida com sucesso' }
  }
}
