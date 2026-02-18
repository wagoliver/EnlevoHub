import { PrismaClient, Prisma } from '@prisma/client'
import { CreateProjectInput, UpdateProjectInput, ListProjectsQuery } from './project.schemas'
import { ContractorScope } from '../rbac/contractor-filter'

export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async create(tenantId: string, data: CreateProjectInput) {
    const project = await this.prisma.project.create({
      data: {
        tenantId,
        name: data.name,
        description: data.description,
        address: data.address as any,
        status: data.status || 'PLANNING',
        startDate: data.startDate ? new Date(data.startDate) : null,
        expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : null,
        budget: data.budget ?? 0,
        quantidadeUnidades: data.quantidadeUnidades ?? 1,
        metadata: data.metadata as any,
      },
      include: {
        evolutions: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        _count: {
          select: { units: true, evolutions: true },
        },
      },
    })

    return this.serializeProject(project)
  }

  async list(tenantId: string, query: ListProjectsQuery, scope?: ContractorScope) {
    const { page, limit, search, status, sortBy, sortOrder } = query
    const skip = (page - 1) * limit

    const where: Prisma.ProjectWhereInput = {
      tenantId,
      ...(status && { status }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      // CONTRACTOR: only projects assigned to them
      ...(scope?.projectIds && { id: { in: scope.projectIds } }),
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          evolutions: {
            orderBy: { date: 'desc' },
            take: 1,
          },
          _count: {
            select: { units: true, evolutions: true, activities: true },
          },
        },
      }),
      this.prisma.project.count({ where }),
    ])

    return {
      data: projects.map(p => this.serializeProject(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getById(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
      include: {
        evolutions: {
          orderBy: { date: 'desc' },
          include: {
            user: {
              select: { id: true, name: true },
            },
          },
        },
        units: {
          orderBy: { code: 'asc' },
        },
        _count: {
          select: {
            units: true,
            evolutions: true,
            purchaseOrders: true,
            financialTransactions: true,
          },
        },
      },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    return this.serializeProjectDetail(project)
  }

  async update(tenantId: string, projectId: string, data: UpdateProjectInput) {
    // Verify project belongs to tenant
    const existing = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!existing) {
      throw new Error('Projeto não encontrado')
    }

    const project = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.address !== undefined && { address: data.address as any }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.startDate !== undefined && {
          startDate: data.startDate ? new Date(data.startDate) : null,
        }),
        ...(data.expectedEndDate !== undefined && {
          expectedEndDate: data.expectedEndDate ? new Date(data.expectedEndDate) : null,
        }),
        ...(data.actualEndDate !== undefined && {
          actualEndDate: data.actualEndDate ? new Date(data.actualEndDate) : null,
        }),
        ...(data.budget !== undefined && { budget: data.budget }),
        ...(data.quantidadeUnidades !== undefined && { quantidadeUnidades: data.quantidadeUnidades }),
        ...(data.metadata !== undefined && { metadata: data.metadata as any }),
      },
      include: {
        evolutions: {
          orderBy: { date: 'desc' },
          take: 1,
        },
        _count: {
          select: { units: true, evolutions: true },
        },
      },
    })

    return this.serializeProject(project)
  }

  async delete(tenantId: string, projectId: string) {
    const existing = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!existing) {
      throw new Error('Projeto não encontrado')
    }

    await this.prisma.project.delete({
      where: { id: projectId },
    })

    return { message: 'Projeto excluído com sucesso' }
  }

  async getStatistics(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) {
      throw new Error('Projeto não encontrado')
    }

    const [
      unitCount,
      unitsByStatus,
      activities,
      purchaseOrderCount,
      transactionStats,
    ] = await Promise.all([
      this.prisma.unit.count({ where: { projectId } }),
      this.prisma.unit.groupBy({
        by: ['status'],
        where: { projectId },
        _count: true,
      }),
      this.prisma.projectActivity.findMany({
        where: { projectId },
        include: { unitActivities: true },
      }),
      this.prisma.purchaseOrder.count({ where: { projectId } }),
      this.prisma.financialTransaction.aggregate({
        where: { projectId },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const unitsMap: Record<string, number> = {}
    unitsByStatus.forEach(u => {
      unitsMap[u.status] = u._count
    })

    // Calculate weighted progress from activities
    let totalWeightedProgress = 0
    let totalWeight = 0
    for (const activity of activities) {
      const weight = Number(activity.weight)
      const progresses = activity.unitActivities.map(ua => Number(ua.progress))
      const avgProgress =
        progresses.length > 0
          ? progresses.reduce((s, p) => s + p, 0) / progresses.length
          : 0
      totalWeightedProgress += weight * avgProgress
      totalWeight += weight
    }
    const currentProgress =
      totalWeight > 0
        ? Math.round((totalWeightedProgress / totalWeight) * 100) / 100
        : 0

    return {
      units: {
        total: unitCount,
        available: unitsMap['AVAILABLE'] || 0,
        reserved: unitsMap['RESERVED'] || 0,
        sold: unitsMap['SOLD'] || 0,
        blocked: unitsMap['BLOCKED'] || 0,
      },
      activitiesCount: activities.length,
      currentProgress,
      purchaseOrders: purchaseOrderCount,
      financialTransactions: transactionStats._count,
      totalSpent: transactionStats._sum.amount
        ? Number(transactionStats._sum.amount)
        : 0,
      budget: Number(project.budget),
    }
  }

  async getDashboardStats(tenantId: string, scope?: ContractorScope) {
    const projectFilter: Prisma.ProjectWhereInput = {
      tenantId,
      ...(scope?.projectIds && { id: { in: scope.projectIds } }),
    }

    const [
      totalProjects,
      projectsByStatus,
      totalUnits,
      unitsByStatus,
      recentProjects,
    ] = await Promise.all([
      this.prisma.project.count({ where: projectFilter }),
      this.prisma.project.groupBy({
        by: ['status'],
        where: projectFilter,
        _count: true,
      }),
      this.prisma.unit.count({
        where: { project: projectFilter },
      }),
      this.prisma.unit.groupBy({
        by: ['status'],
        where: { project: projectFilter },
        _count: true,
      }),
      this.prisma.project.findMany({
        where: projectFilter,
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          evolutions: {
            orderBy: { date: 'desc' },
            take: 1,
          },
          _count: {
            select: { units: true },
          },
        },
      }),
    ])

    const projectStatusMap: Record<string, number> = {}
    projectsByStatus.forEach(p => {
      projectStatusMap[p.status] = p._count
    })

    const unitStatusMap: Record<string, number> = {}
    unitsByStatus.forEach(u => {
      unitStatusMap[u.status] = u._count
    })

    return {
      projects: {
        total: totalProjects,
        planning: projectStatusMap['PLANNING'] || 0,
        inProgress: projectStatusMap['IN_PROGRESS'] || 0,
        paused: projectStatusMap['PAUSED'] || 0,
        completed: projectStatusMap['COMPLETED'] || 0,
        cancelled: projectStatusMap['CANCELLED'] || 0,
      },
      units: {
        total: totalUnits,
        available: unitStatusMap['AVAILABLE'] || 0,
        reserved: unitStatusMap['RESERVED'] || 0,
        sold: unitStatusMap['SOLD'] || 0,
        blocked: unitStatusMap['BLOCKED'] || 0,
      },
      recentProjects: recentProjects.map(p => this.serializeProject(p)),
    }
  }

  private serializeProject(project: any) {
    return {
      ...project,
      budget: Number(project.budget),
      evolutions: project.evolutions?.map((e: any) => ({
        ...e,
        percentage: Number(e.percentage),
      })),
      units: project.units?.map((u: any) => ({
        ...u,
        area: Number(u.area),
        price: Number(u.price),
      })),
    }
  }

  private serializeProjectDetail(project: any) {
    return {
      ...project,
      budget: Number(project.budget),
      evolutions: project.evolutions?.map((e: any) => ({
        ...e,
        percentage: Number(e.percentage),
      })),
      units: project.units?.map((u: any) => ({
        ...u,
        area: Number(u.area),
        price: Number(u.price),
      })),
    }
  }
}
