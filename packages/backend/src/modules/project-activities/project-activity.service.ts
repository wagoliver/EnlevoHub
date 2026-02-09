import { PrismaClient, Prisma } from '@prisma/client'
import {
  CreateProjectActivityInput,
  UpdateProjectActivityInput,
  CreateFromTemplateWithScheduleInput,
} from './project-activity.schemas'
import { ContractorScope } from '../../core/rbac/contractor-filter'

export class ProjectActivityService {
  constructor(private prisma: PrismaClient) {}

  async listByProject(tenantId: string, projectId: string, scope?: ContractorScope) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    // Build where clause - filter by contractor activities if scope has activityIds
    const where: Prisma.ProjectActivityWhereInput = { projectId }
    if (scope?.activityIds && scope.activityIds.length > 0) {
      // Get activity IDs that belong to this project
      const projectActivityIds = await this.prisma.contractorActivity.findMany({
        where: {
          contractorId: scope.contractorId,
          activity: { projectId },
        },
        select: { projectActivityId: true },
      })
      const filteredIds = projectActivityIds.map(ca => ca.projectActivityId)
      if (filteredIds.length > 0) {
        // Include filtered activities AND their parent phases/stages for tree context
        const filteredActivities = await this.prisma.projectActivity.findMany({
          where: { id: { in: filteredIds } },
          select: { id: true, parentId: true },
        })
        const allIds = new Set(filteredIds)
        // Collect all ancestor IDs
        const parentIds = filteredActivities
          .map(a => a.parentId)
          .filter((pid): pid is string => pid !== null)
        if (parentIds.length > 0) {
          const ancestors = await this.prisma.projectActivity.findMany({
            where: { projectId, id: { in: parentIds } },
            select: { id: true, parentId: true },
          })
          ancestors.forEach(a => allIds.add(a.id))
          // Get grandparents too (phase level)
          const gpIds = ancestors
            .map(a => a.parentId)
            .filter((pid): pid is string => pid !== null)
          gpIds.forEach(gpId => allIds.add(gpId))
        }
        where.id = { in: Array.from(allIds) }
      }
    }

    const activities = await this.prisma.projectActivity.findMany({
      where,
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

    // Check if we have hierarchical data
    const hasHierarchy = activities.some(a => a.level === 'PHASE' || a.level === 'STAGE')

    const serialized = activities.map(a => {
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

    if (hasHierarchy) {
      return this.buildActivityTree(serialized)
    }

    return serialized
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

  /**
   * Legacy flat template import (backward compat).
   */
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

  /**
   * Hierarchical template import with schedule data.
   */
  async createFromTemplateWithSchedule(
    tenantId: string,
    projectId: string,
    data: CreateFromTemplateWithScheduleInput
  ) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    // Verify template exists
    const template = await this.prisma.activityTemplate.findFirst({
      where: { id: data.templateId, tenantId },
    })
    if (!template) throw new Error('Template não encontrado')

    // Update project scheduling config
    if (data.schedulingMode) {
      await this.prisma.project.update({
        where: { id: projectId },
        data: {
          schedulingMode: data.schedulingMode,
          holidays: data.holidays || Prisma.JsonNull,
        },
      })
    }

    const units = await this.prisma.unit.findMany({
      where: { projectId },
      select: { id: true },
    })

    return this.prisma.$transaction(async (tx) => {
      const created = await this.createActivitiesRecursive(
        tx, projectId, data.activities, null, units
      )
      return created
    })
  }

  /**
   * Recursively create ProjectActivities from hierarchical schedule data.
   */
  private async createActivitiesRecursive(
    tx: any,
    projectId: string,
    activities: any[],
    parentId: string | null,
    units: { id: string }[]
  ): Promise<any[]> {
    const results: any[] = []

    for (const act of activities) {
      const actData: any = {
        projectId,
        name: act.name,
        weight: act.weight || 1,
        order: act.order,
        level: act.level,
        parentId,
        color: act.color || null,
        dependencies: act.dependencies || null,
      }

      if (act.plannedStartDate) {
        actData.plannedStartDate = new Date(act.plannedStartDate)
      }
      if (act.plannedEndDate) {
        actData.plannedEndDate = new Date(act.plannedEndDate)
      }

      // Only leaf ACTIVITY level gets scope and unit activities
      if (act.level === 'ACTIVITY') {
        actData.scope = act.scope || 'ALL_UNITS'
      } else {
        actData.scope = 'GENERAL'
      }

      const created = await tx.projectActivity.create({ data: actData })

      // Create UnitActivities for leaf activities
      if (act.level === 'ACTIVITY') {
        const scope = act.scope || 'ALL_UNITS'
        if (scope === 'ALL_UNITS' && units.length > 0) {
          await tx.unitActivity.createMany({
            data: units.map((u: any) => ({
              activityId: created.id,
              unitId: u.id,
            })),
          })
        } else if (scope === 'GENERAL') {
          await tx.unitActivity.create({
            data: { activityId: created.id, unitId: null },
          })
        }
      }

      const result: any = { ...created, weight: Number(created.weight) }

      // Recurse for children
      if (act.children?.length) {
        result.children = await this.createActivitiesRecursive(
          tx, projectId, act.children, created.id, units
        )
      }

      results.push(result)
    }

    return results
  }

  async getProjectProgress(tenantId: string, projectId: string, scope?: ContractorScope) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    // Build where clause - filter by contractor activities if scope has activityIds
    const where: Prisma.ProjectActivityWhereInput = { projectId }
    if (scope?.activityIds && scope.activityIds.length > 0) {
      const projectActivityIds = await this.prisma.contractorActivity.findMany({
        where: {
          contractorId: scope.contractorId,
          activity: { projectId },
        },
        select: { projectActivityId: true },
      })
      const filteredIds = projectActivityIds.map(ca => ca.projectActivityId)
      if (filteredIds.length > 0) {
        const filteredActivities = await this.prisma.projectActivity.findMany({
          where: { id: { in: filteredIds } },
          select: { id: true, parentId: true },
        })
        const allIds = new Set(filteredIds)
        const parentIds = filteredActivities
          .map(a => a.parentId)
          .filter((pid): pid is string => pid !== null)
        if (parentIds.length > 0) {
          const ancestors = await this.prisma.projectActivity.findMany({
            where: { projectId, id: { in: parentIds } },
            select: { id: true, parentId: true },
          })
          ancestors.forEach(a => allIds.add(a.id))
          const gpIds = ancestors
            .map(a => a.parentId)
            .filter((pid): pid is string => pid !== null)
          gpIds.forEach(gpId => allIds.add(gpId))
        }
        where.id = { in: Array.from(allIds) }
      }
    }

    const activities = await this.prisma.projectActivity.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        unitActivities: true,
        _count: { select: { unitActivities: true } },
      },
    })

    // Separate phases from leaf activities
    const phases = activities.filter(a => a.level === 'PHASE')
    const leafActivities = activities.filter(a => a.level === 'ACTIVITY' || (!a.level))

    // If no hierarchy, use flat calculation
    if (phases.length === 0) {
      return this.calculateFlatProgress(leafActivities)
    }

    // Hierarchical progress calculation
    return this.calculateHierarchicalProgress(activities)
  }

  private calculateFlatProgress(activities: any[]) {
    let totalWeightedProgress = 0
    let totalWeight = 0

    const activityDetails = activities.map(a => {
      const weight = Number(a.weight)
      const unitActivities = a.unitActivities.map((ua: any) => Number(ua.progress))
      const avgProgress =
        unitActivities.length > 0
          ? unitActivities.reduce((sum: number, p: number) => sum + p, 0) / unitActivities.length
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

  private calculateHierarchicalProgress(activities: any[]) {
    // Build a map id -> activity with progress
    const actMap = new Map<string, any>()
    for (const a of activities) {
      const unitActivities = a.unitActivities.map((ua: any) => Number(ua.progress))
      const avgProgress =
        unitActivities.length > 0
          ? unitActivities.reduce((sum: number, p: number) => sum + p, 0) / unitActivities.length
          : 0

      actMap.set(a.id, {
        id: a.id,
        name: a.name,
        weight: Number(a.weight),
        level: a.level,
        parentId: a.parentId,
        progress: Math.round(avgProgress * 100) / 100,
        status: a.status,
        unitCount: a._count.unitActivities,
        color: a.color,
        plannedStartDate: a.plannedStartDate,
        plannedEndDate: a.plannedEndDate,
        children: [] as any[],
      })
    }

    // Build tree
    const roots: any[] = []
    for (const item of actMap.values()) {
      if (item.parentId && actMap.has(item.parentId)) {
        actMap.get(item.parentId).children.push(item)
      } else if (!item.parentId) {
        roots.push(item)
      }
    }

    // Calculate progress bottom-up
    const calcProgress = (node: any): number => {
      if (node.children.length === 0) {
        return node.progress
      }
      const totalWeight = node.children.reduce((s: number, c: any) => s + c.weight, 0)
      if (totalWeight === 0) return 0
      const weighted = node.children.reduce((s: number, c: any) => {
        const childProgress = calcProgress(c)
        c.progress = Math.round(childProgress * 100) / 100
        return s + c.weight * childProgress
      }, 0)
      return weighted / totalWeight
    }

    let totalWeightedProgress = 0
    let totalWeight = 0
    const phaseDetails = roots.map(phase => {
      const progress = calcProgress(phase)
      phase.progress = Math.round(progress * 100) / 100
      totalWeightedProgress += phase.weight * progress
      totalWeight += phase.weight
      return phase
    })

    const overallProgress =
      totalWeight > 0
        ? Math.round((totalWeightedProgress / totalWeight) * 100) / 100
        : 0

    return {
      overallProgress,
      activities: phaseDetails,
    }
  }

  /**
   * Build tree from flat activity list for the API response.
   */
  private buildActivityTree(activities: any[]): any[] {
    const actMap = new Map<string, any>()
    activities.forEach(a => {
      actMap.set(a.id, { ...a, children: [] })
    })

    const roots: any[] = []
    for (const item of actMap.values()) {
      if (item.parentId && actMap.has(item.parentId)) {
        actMap.get(item.parentId).children.push(item)
      } else if (!item.parentId) {
        roots.push(item)
      }
    }

    // Sort children by order
    const sortChildren = (node: any) => {
      node.children.sort((a: any, b: any) => a.order - b.order)
      node.children.forEach(sortChildren)
    }
    roots.sort((a: any, b: any) => a.order - b.order)
    roots.forEach(sortChildren)

    return roots
  }
}
