import { PrismaClient, Prisma } from '@prisma/client'
import {
  CreateActivityTemplateInput,
  UpdateActivityTemplateInput,
  ListActivityTemplatesQuery,
  PreviewScheduleInput,
} from './activity-template.schemas'
import { SchedulingService, SchedulePhaseInput } from './scheduling.service'

export class ActivityTemplateService {
  private schedulingService = new SchedulingService()

  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string, query: ListActivityTemplatesQuery) {
    const { page, limit, search } = query
    const skip = (page - 1) * limit

    const where: Prisma.ActivityTemplateWhereInput = {
      tenantId,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    }

    const [templates, total] = await Promise.all([
      this.prisma.activityTemplate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          items: { orderBy: { order: 'asc' } },
          _count: { select: { items: true } },
        },
      }),
      this.prisma.activityTemplate.count({ where }),
    ])

    return {
      data: templates.map(t => this.serializeWithTree(t)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getById(tenantId: string, id: string) {
    const template = await this.prisma.activityTemplate.findFirst({
      where: { id, tenantId },
      include: {
        items: { orderBy: { order: 'asc' } },
      },
    })

    if (!template) {
      throw new Error('Template não encontrado')
    }

    return this.serializeWithTree(template)
  }

  async create(tenantId: string, data: CreateActivityTemplateInput) {
    const template = await this.prisma.$transaction(async (tx) => {
      const created = await tx.activityTemplate.create({
        data: {
          tenantId,
          name: data.name,
          description: data.description,
        },
      })

      if (data.phases?.length) {
        await this.createHierarchicalItems(tx, created.id, data.phases)
      } else if (data.items?.length) {
        // Legacy flat format
        await tx.activityTemplateItem.createMany({
          data: data.items.map(item => ({
            templateId: created.id,
            name: item.name,
            order: item.order,
            weight: item.weight,
            level: 'ACTIVITY' as const,
          })),
        })
      }

      return tx.activityTemplate.findUnique({
        where: { id: created.id },
        include: { items: { orderBy: { order: 'asc' } } },
      })
    })

    return this.serializeWithTree(template)
  }

  async update(tenantId: string, id: string, data: UpdateActivityTemplateInput) {
    const existing = await this.prisma.activityTemplate.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error('Template não encontrado')
    }

    const template = await this.prisma.$transaction(async (tx) => {
      await tx.activityTemplate.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
        },
      })

      if (data.phases) {
        // Delete all existing items and recreate hierarchically
        await tx.activityTemplateItem.deleteMany({ where: { templateId: id } })
        await this.createHierarchicalItems(tx, id, data.phases)
      } else if (data.items) {
        // Legacy flat update
        await tx.activityTemplateItem.deleteMany({ where: { templateId: id } })
        await tx.activityTemplateItem.createMany({
          data: data.items.map(item => ({
            templateId: id,
            name: item.name,
            order: item.order,
            weight: item.weight,
            level: 'ACTIVITY' as const,
          })),
        })
      }

      return tx.activityTemplate.findUnique({
        where: { id },
        include: { items: { orderBy: { order: 'asc' } } },
      })
    })

    return this.serializeWithTree(template)
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.activityTemplate.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error('Template não encontrado')
    }

    await this.prisma.activityTemplate.delete({ where: { id } })

    return { message: 'Template excluído com sucesso' }
  }

  async previewSchedule(tenantId: string, id: string, config: PreviewScheduleInput) {
    const template = await this.prisma.activityTemplate.findFirst({
      where: { id, tenantId },
      include: { items: { orderBy: { order: 'asc' } } },
    })

    if (!template) {
      throw new Error('Template não encontrado')
    }

    // Build phases from items
    const phases = this.buildPhasesForScheduling(template.items)

    if (phases.length === 0) {
      throw new Error('Template não possui fases hierárquicas para gerar cronograma')
    }

    const schedule = this.schedulingService.calculateSchedule(
      {
        startDate: config.startDate,
        endDate: config.endDate,
        mode: config.mode,
        holidays: config.holidays,
      },
      phases
    )

    return { schedule }
  }

  /**
   * Create hierarchical items (phase > stage > activity) recursively.
   */
  private async createHierarchicalItems(
    tx: any,
    templateId: string,
    phases: any[]
  ) {
    for (const phase of phases) {
      const phaseItem = await tx.activityTemplateItem.create({
        data: {
          templateId,
          name: phase.name,
          order: phase.order,
          weight: 1,
          level: 'PHASE',
          percentageOfTotal: phase.percentageOfTotal,
          color: phase.color || null,
        },
      })

      for (const stage of phase.stages) {
        const stageItem = await tx.activityTemplateItem.create({
          data: {
            templateId,
            name: stage.name,
            order: stage.order,
            weight: 1,
            level: 'STAGE',
            parentId: phaseItem.id,
          },
        })

        for (const activity of stage.activities) {
          await tx.activityTemplateItem.create({
            data: {
              templateId,
              name: activity.name,
              order: activity.order,
              weight: activity.weight,
              level: 'ACTIVITY',
              parentId: stageItem.id,
              durationDays: activity.durationDays || null,
              dependencies: activity.dependencies || null,
            },
          })
        }
      }
    }
  }

  /**
   * Build a tree structure from flat items based on parentId.
   */
  private buildTree(items: any[]): any[] {
    const serialized = items.map(item => ({
      ...item,
      weight: Number(item.weight),
      percentageOfTotal: item.percentageOfTotal ? Number(item.percentageOfTotal) : null,
    }))

    const itemMap = new Map<string, any>()
    serialized.forEach(item => {
      itemMap.set(item.id, { ...item, children: [] })
    })

    const roots: any[] = []
    for (const item of itemMap.values()) {
      if (item.parentId && itemMap.has(item.parentId)) {
        itemMap.get(item.parentId).children.push(item)
      } else if (!item.parentId) {
        roots.push(item)
      }
    }

    // Sort children by order
    const sortChildren = (node: any) => {
      node.children.sort((a: any, b: any) => a.order - b.order)
      node.children.forEach(sortChildren)
    }
    roots.sort((a, b) => a.order - b.order)
    roots.forEach(sortChildren)

    return roots
  }

  /**
   * Build phases input for the scheduling service from flat DB items.
   */
  private buildPhasesForScheduling(items: any[]): SchedulePhaseInput[] {
    const tree = this.buildTree(items)
    const phases: SchedulePhaseInput[] = []

    for (const node of tree) {
      if (node.level === 'PHASE') {
        const stages = (node.children || []).map((stageNode: any) => ({
          name: stageNode.name,
          order: stageNode.order,
          activities: (stageNode.children || []).map((actNode: any) => ({
            name: actNode.name,
            order: actNode.order,
            weight: actNode.weight,
            durationDays: actNode.durationDays,
            dependencies: actNode.dependencies,
          })),
        }))

        phases.push({
          name: node.name,
          order: node.order,
          percentageOfTotal: node.percentageOfTotal || 0,
          color: node.color,
          stages,
        })
      }
    }

    return phases
  }

  /**
   * Serialize template with hierarchical tree and legacy flat items.
   */
  private serializeWithTree(template: any) {
    if (!template) return template

    const items = template.items || []
    const hasHierarchy = items.some((i: any) => i.level === 'PHASE' || i.level === 'STAGE')

    return {
      ...template,
      items: items.map((item: any) => ({
        ...item,
        weight: Number(item.weight),
        percentageOfTotal: item.percentageOfTotal ? Number(item.percentageOfTotal) : null,
      })),
      // Add hierarchical tree representation when hierarchy exists
      ...(hasHierarchy && { phases: this.buildTree(items) }),
    }
  }
}
