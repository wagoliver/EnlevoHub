import bcrypt from 'bcrypt'
import { PrismaClient, User, Tenant } from '@prisma/client'
import { JWTService, TokenPair } from './jwt.service'

const SALT_ROUNDS = 12

export interface RegisterInput {
  email: string
  password: string
  name: string
  tenantName: string
  tenantDocument: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    name: string
    role: string
    tenantId: string
  }
  tenant: {
    id: string
    name: string
    plan: string
  }
  tokens: TokenPair
}

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private jwtService: JWTService
  ) {}

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

      // Create user (admin of the tenant)
      const user = await tx.user.create({
        data: {
          email: input.email,
          password: hashedPassword,
          name: input.name,
          role: 'ADMIN',
          tenantId: tenant.id,
          permissions: {}
        }
      })

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
        tenantId: result.tenant.id
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
   * Login user
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { tenant: true }
    })

    if (!user) {
      throw new Error('Invalid email or password')
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, user.password)

    if (!isValidPassword) {
      throw new Error('Invalid email or password')
    }

    // Generate tokens
    const tokens = await this.jwtService.generateTokens({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role
    })

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId
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
      role: user.role
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
      createdAt: user.createdAt,
      tenant: user.tenant
    }
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
}
