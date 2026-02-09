import { PrismaClient } from '@prisma/client'
import {
  CreateProjectActivityInput,
  UpdateProjectActivityInput,
} from './project-activity.schemas'

export class ProjectActivityService {
  constructor(private prisma: PrismaClient) {}

  async listByProject(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    const activities = await this.prisma.projectActivity.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        unitActivities: {
          include: {
            unit: { select: { id: true, code: true, type: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { unitActivities: true, measurements: true } },
      },
    })

    return activities.map(a => {
      const unitActivities = a.unitActivities.map(ua => ({
        ...ua,
        progress: Number(ua.progress),
      }))
      const avgProgress =
        unitActivities.length > 0
          ? unitActivities.reduce((sum, ua) => sum + ua.progress, 0) / unitActivities.length
          : 0

      return {
        ...a,
        weight: Number(a.weight),
        averageProgress: Math.round(avgProgress * 100) / 100,
        unitActivities,
      }
    })
  }

  async getById(tenantId: string, projectId: string, activityId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    const activity = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, projectId },
      include: {
        unitActivities: {
          include: {
            unit: { select: { id: true, code: true, type: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        measurements: {
          include: {
            reporter: { select: { id: true, name: true } },
            reviewer: { select: { id: true, name: true } },
            contractor: { select: { id: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!activity) throw new Error('Atividade não encontrada')

    return {
      ...activity,
      weight: Number(activity.weight),
      unitActivities: activity.unitActivities.map(ua => ({
        ...ua,
        progress: Number(ua.progress),
      })),
      measurements: activity.measurements.map(m => ({
        ...m,
        progress: Number(m.progress),
        previousProgress: Number(m.previousProgress),
      })),
    }
  }

  async create(tenantId: string, projectId: string, data: CreateProjectActivityInput) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    return this.prisma.$transaction(async (tx) => {
      // Create the activity
      const activity = await tx.projectActivity.create({
        data: {
          projectId,
          name: data.name,
          weight: data.weight,
          order: data.order,
          scope: data.scope,
        },
      })

      // Auto-generate UnitActivities based on scope
      if (data.scope === 'ALL_UNITS') {
        const units = await tx.unit.findMany({
          where: { projectId },
          select: { id: true },
        })
        if (units.length > 0) {
          await tx.unitActivity.createMany({
            data: units.map(u => ({
              activityId: activity.id,
              unitId: u.id,
            })),
          })
        }
      } else if (data.scope === 'SPECIFIC_UNITS' && data.unitIds?.length) {
        await tx.unitActivity.createMany({
          data: data.unitIds.map(unitId => ({
            activityId: activity.id,
            unitId,
          })),
        })
      } else if (data.scope === 'GENERAL') {
        await tx.unitActivity.create({
          data: {
            activityId: activity.id,
            unitId: null,
          },
        })
      }

      // Return with includes
      return tx.projectActivity.findUnique({
        where: { id: activity.id },
        include: {
          unitActivities: {
            include: {
              unit: { select: { id: true, code: true, type: true } },
            },
          },
          _count: { select: { unitActivities: true } },
        },
      })
    }).then(a => a ? { ...a, weight: Number(a.weight) } : a)
  }

  async update(
    tenantId: string,
    projectId: string,
    activityId: string,
    data: UpdateProjectActivityInput
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    const existing = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, projectId },
    })
    if (!existing) throw new Error('Atividade não encontrada')

    const activity = await this.prisma.projectActivity.update({
      where: { id: activityId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.weight !== undefined && { weight: data.weight }),
        ...(data.order !== undefined && { order: data.order }),
      },
      include: {
        unitActivities: {
          include: {
            unit: { select: { id: true, code: true, type: true } },
          },
        },
        _count: { select: { unitActivities: true, measurements: true } },
      },
    })

    return {
      ...activity,
      weight: Number(activity.weight),
      unitActivities: activity.unitActivities.map(ua => ({
        ...ua,
        progress: Number(ua.progress),
      })),
    }
  }

  async delete(tenantId: string, projectId: string, activityId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    const existing = await this.prisma.projectActivity.findFirst({
      where: { id: activityId, projectId },
    })
    if (!existing) throw new Error('Atividade não encontrada')

    await this.prisma.projectActivity.delete({ where: { id: activityId } })

    return { message: 'Atividade excluída com sucesso' }
  }

  async createFromTemplate(tenantId: string, projectId: string, templateId: string) {
    const [project, template] = await Promise.all([
      this.prisma.project.findFirst({ where: { id: projectId, tenantId } }),
      this.prisma.activityTemplate.findFirst({
        where: { id: templateId, tenantId },
        include: { items: { orderBy: { order: 'asc' } } },
      }),
    ])

    if (!project) throw new Error('Projeto não encontrado')
    if (!template) throw new Error('Template não encontrado')

    const units = await this.prisma.unit.findMany({
      where: { projectId },
      select: { id: true },
    })

    return this.prisma.$transaction(async (tx) => {
      const activities = []

      for (const item of template.items) {
        const activity = await tx.projectActivity.create({
          data: {
            projectId,
            name: item.name,
            weight: Number(item.weight),
            order: item.order,
            scope: 'ALL_UNITS',
          },
        })

        // Create UnitActivity for each unit
        if (units.length > 0) {
          await tx.unitActivity.createMany({
            data: units.map(u => ({
              activityId: activity.id,
              unitId: u.id,
            })),
          })
        }

        activities.push(activity)
      }

      return activities.map(a => ({
        ...a,
        weight: Number(a.weight),
      }))
    })
  }

  async getProjectProgress(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    const activities = await this.prisma.projectActivity.findMany({
      where: { projectId },
      orderBy: { order: 'asc' },
      include: {
        unitActivities: true,
        _count: { select: { unitActivities: true } },
      },
    })

    let totalWeightedProgress = 0
    let totalWeight = 0

    const activityDetails = activities.map(a => {
      const weight = Number(a.weight)
      const unitActivities = a.unitActivities.map(ua => Number(ua.progress))
      const avgProgress =
        unitActivities.length > 0
          ? unitActivities.reduce((sum, p) => sum + p, 0) / unitActivities.length
          : 0

      totalWeightedProgress += weight * avgProgress
      totalWeight += weight

      return {
        id: a.id,
        name: a.name,
        weight,
        progress: Math.round(avgProgress * 100) / 100,
        status: a.status,
        unitCount: a._count.unitActivities,
      }
    })

    const overallProgress =
      totalWeight > 0
        ? Math.round((totalWeightedProgress / totalWeight) * 100) / 100
        : 0

    return {
      overallProgress,
      activities: activityDetails,
    }
  }
}
