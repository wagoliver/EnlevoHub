import { PrismaClient, Prisma } from '@prisma/client'
import {
  CreateActivityTemplateInput,
  UpdateActivityTemplateInput,
  ListActivityTemplatesQuery,
} from './activity-template.schemas'

export class ActivityTemplateService {
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
      data: templates.map(t => this.serialize(t)),
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

    return this.serialize(template)
  }

  async create(tenantId: string, data: CreateActivityTemplateInput) {
    const template = await this.prisma.$transaction(async (tx) => {
      const created = await tx.activityTemplate.create({
        data: {
          tenantId,
          name: data.name,
          description: data.description,
          items: {
            create: data.items.map(item => ({
              name: item.name,
              order: item.order,
              weight: item.weight,
            })),
          },
        },
        include: {
          items: { orderBy: { order: 'asc' } },
        },
      })

      return created
    })

    return this.serialize(template)
  }

  async update(tenantId: string, id: string, data: UpdateActivityTemplateInput) {
    const existing = await this.prisma.activityTemplate.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error('Template não encontrado')
    }

    const template = await this.prisma.$transaction(async (tx) => {
      // Update template fields
      await tx.activityTemplate.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
        },
      })

      // If items provided, replace all
      if (data.items) {
        await tx.activityTemplateItem.deleteMany({ where: { templateId: id } })
        await tx.activityTemplateItem.createMany({
          data: data.items.map(item => ({
            templateId: id,
            name: item.name,
            order: item.order,
            weight: item.weight,
          })),
        })
      }

      return tx.activityTemplate.findUnique({
        where: { id },
        include: {
          items: { orderBy: { order: 'asc' } },
        },
      })
    })

    return this.serialize(template)
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

  private serialize(template: any) {
    if (!template) return template
    return {
      ...template,
      items: template.items?.map((item: any) => ({
        ...item,
        weight: Number(item.weight),
      })),
    }
  }
}
