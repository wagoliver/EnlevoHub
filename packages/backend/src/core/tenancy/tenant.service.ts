import { PrismaClient, Tenant } from '@prisma/client'

export interface TenantSettings {
  maxProjects?: number
  maxUsers?: number
  features?: {
    projects?: boolean
    financial?: boolean
    units?: boolean
    contracts?: boolean
    suppliers?: boolean
    contractors?: boolean
    brokers?: boolean
  }
  customization?: {
    logo?: string
    primaryColor?: string
    secondaryColor?: string
  }
}

export class TenantService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get tenant by ID
   */
  async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }
    })

    if (!tenant) {
      throw new Error('Tenant not found')
    }

    return tenant
  }

  /**
   * Update tenant settings
   */
  async updateSettings(tenantId: string, settings: TenantSettings): Promise<Tenant> {
    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        settings: settings as any
      }
    })

    return tenant
  }

  /**
   * Get tenant settings
   */
  async getSettings(tenantId: string): Promise<TenantSettings> {
    const tenant = await this.getTenant(tenantId)
    return (tenant.settings as TenantSettings) || {}
  }

  /**
   * Check if tenant has feature enabled
   */
  async hasFeature(tenantId: string, feature: string): Promise<boolean> {
    const settings = await this.getSettings(tenantId)
    const features = settings.features || {}

    // By default, all features are enabled
    return (features as any)[feature] !== false
  }

  /**
   * Check tenant plan limits
   */
  async checkLimit(tenantId: string, resource: 'projects' | 'users'): Promise<{ allowed: boolean; current: number; limit: number }> {
    const tenant = await this.getTenant(tenantId)
    const settings = (tenant.settings as TenantSettings) || {}

    let current = 0
    let limit = Infinity

    if (resource === 'projects') {
      current = await this.prisma.project.count({
        where: { tenantId }
      })
      limit = settings.maxProjects || this.getDefaultLimit(tenant.plan, 'projects')
    } else if (resource === 'users') {
      current = await this.prisma.user.count({
        where: { tenantId }
      })
      limit = settings.maxUsers || this.getDefaultLimit(tenant.plan, 'users')
    }

    return {
      allowed: current < limit,
      current,
      limit
    }
  }

  /**
   * Get default limits by plan
   */
  private getDefaultLimit(plan: string, resource: 'projects' | 'users'): number {
    const limits: Record<string, Record<string, number>> = {
      FREE: {
        projects: 1,
        users: 2
      },
      BASIC: {
        projects: 5,
        users: 5
      },
      PRO: {
        projects: 20,
        users: 15
      },
      ENTERPRISE: {
        projects: Infinity,
        users: Infinity
      }
    }

    return limits[plan]?.[resource] || Infinity
  }

  /**
   * Get tenant statistics
   */
  async getStatistics(tenantId: string) {
    const [
      projectCount,
      userCount,
      supplierCount,
      contractorCount,
      unitCount,
      saleCount
    ] = await Promise.all([
      this.prisma.project.count({ where: { tenantId } }),
      this.prisma.user.count({ where: { tenantId } }),
      this.prisma.supplier.count({ where: { tenantId } }),
      this.prisma.contractor.count({ where: { tenantId } }),
      this.prisma.unit.count({
        where: { project: { tenantId } }
      }),
      this.prisma.sale.count({
        where: { unit: { project: { tenantId } } }
      })
    ])

    return {
      projects: projectCount,
      users: userCount,
      suppliers: supplierCount,
      contractors: contractorCount,
      units: unitCount,
      sales: saleCount
    }
  }

  /**
   * List all users in tenant
   */
  async getUsers(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
  }
}
