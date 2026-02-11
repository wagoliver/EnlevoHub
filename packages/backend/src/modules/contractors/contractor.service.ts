import { PrismaClient, Prisma } from '@prisma/client'
import {
  CreateContractorInput,
  UpdateContractorInput,
  ListContractorsQuery,
  AssignContractorToProjectInput,
} from './contractor.schemas'

export class ContractorService {
  constructor(private prisma: PrismaClient) {}

  async list(tenantId: string, query: ListContractorsQuery) {
    const { page, limit, search, specialty, isActive } = query
    const skip = (page - 1) * limit

    const where: Prisma.ContractorWhereInput = {
      tenantId,
      ...(isActive !== undefined && { isActive }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { document: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(specialty && {
        specialty: { has: specialty },
      }),
    }

    const [contractors, total] = await Promise.all([
      this.prisma.contractor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { projects: true, measurements: true } },
        },
      }),
      this.prisma.contractor.count({ where }),
    ])

    return {
      data: contractors.map(c => this.serialize(c)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getById(tenantId: string, id: string) {
    const contractor = await this.prisma.contractor.findFirst({
      where: { id, tenantId },
      include: {
        projects: {
          include: {
            project: {
              select: { id: true, name: true, status: true },
            },
          },
        },
        _count: { select: { projects: true, measurements: true } },
      },
    })

    if (!contractor) {
      throw new Error('Empreiteiro não encontrado')
    }

    return this.serialize(contractor)
  }

  async create(tenantId: string, data: CreateContractorInput) {
    const contractor = await this.prisma.contractor.create({
      data: {
        tenantId,
        name: data.name,
        document: data.document,
        specialty: data.specialty,
        teamSize: data.teamSize,
        contacts: data.contacts as any,
        rating: data.rating,
      },
      include: {
        _count: { select: { projects: true, measurements: true } },
      },
    })

    return this.serialize(contractor)
  }

  async update(tenantId: string, id: string, data: UpdateContractorInput) {
    const existing = await this.prisma.contractor.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error('Empreiteiro não encontrado')
    }

    const contractor = await this.prisma.contractor.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.document !== undefined && { document: data.document }),
        ...(data.specialty !== undefined && { specialty: data.specialty }),
        ...(data.teamSize !== undefined && { teamSize: data.teamSize }),
        ...(data.contacts !== undefined && { contacts: data.contacts as any }),
        ...(data.rating !== undefined && { rating: data.rating }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        _count: { select: { projects: true, measurements: true } },
      },
    })

    return this.serialize(contractor)
  }

  async delete(tenantId: string, id: string) {
    const existing = await this.prisma.contractor.findFirst({
      where: { id, tenantId },
    })

    if (!existing) {
      throw new Error('Empreiteiro não encontrado')
    }

    await this.prisma.contractor.delete({ where: { id } })

    return { message: 'Empreiteiro excluído com sucesso' }
  }

  async assignToProject(
    tenantId: string,
    contractorId: string,
    projectId: string,
    data: AssignContractorToProjectInput
  ) {
    // Verify both belong to tenant
    const [contractor, project] = await Promise.all([
      this.prisma.contractor.findFirst({ where: { id: contractorId, tenantId } }),
      this.prisma.project.findFirst({ where: { id: projectId, tenantId } }),
    ])

    if (!contractor) throw new Error('Empreiteiro não encontrado')
    if (!project) throw new Error('Projeto não encontrado')

    const assignment = await this.prisma.contractorProject.create({
      data: {
        contractorId,
        projectId,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
        role: data.role,
      },
      include: {
        project: { select: { id: true, name: true, status: true } },
      },
    })

    return assignment
  }

  async unassignFromProject(tenantId: string, contractorId: string, projectId: string) {
    const contractor = await this.prisma.contractor.findFirst({
      where: { id: contractorId, tenantId },
    })

    if (!contractor) throw new Error('Empreiteiro não encontrado')

    const assignment = await this.prisma.contractorProject.findUnique({
      where: {
        contractorId_projectId: { contractorId, projectId },
      },
    })

    if (!assignment) throw new Error('Vínculo não encontrado')

    await this.prisma.contractorProject.delete({
      where: { id: assignment.id },
    })

    return { message: 'Vínculo removido com sucesso' }
  }

  async listByProject(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })

    if (!project) throw new Error('Projeto não encontrado')

    const assignments = await this.prisma.contractorProject.findMany({
      where: { projectId },
      include: {
        contractor: {
          select: {
            id: true,
            name: true,
            document: true,
            specialty: true,
            contacts: true,
            rating: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return assignments.map(a => ({
      ...a,
      contractor: {
        ...a.contractor,
        rating: a.contractor.rating ? Number(a.contractor.rating) : null,
      },
    }))
  }

  async assignActivities(tenantId: string, contractorId: string, activityIds: string[]) {
    const contractor = await this.prisma.contractor.findFirst({
      where: { id: contractorId, tenantId },
    })
    if (!contractor) throw new Error('Empreiteiro não encontrado')

    await this.prisma.contractorActivity.createMany({
      data: activityIds.map(activityId => ({
        contractorId,
        projectActivityId: activityId,
      })),
      skipDuplicates: true,
    })

    return { message: 'Atividades atribuídas com sucesso', count: activityIds.length }
  }

  async unassignActivity(tenantId: string, contractorId: string, activityId: string) {
    const contractor = await this.prisma.contractor.findFirst({
      where: { id: contractorId, tenantId },
    })
    if (!contractor) throw new Error('Empreiteiro não encontrado')

    const existing = await this.prisma.contractorActivity.findUnique({
      where: {
        contractorId_projectActivityId: { contractorId, projectActivityId: activityId },
      },
    })
    if (!existing) throw new Error('Vínculo de atividade não encontrado')

    await this.prisma.contractorActivity.delete({ where: { id: existing.id } })

    return { message: 'Atividade desvinculada com sucesso' }
  }

  async listActivitiesByProject(tenantId: string, contractorId: string, projectId: string) {
    const [contractor, project] = await Promise.all([
      this.prisma.contractor.findFirst({ where: { id: contractorId, tenantId } }),
      this.prisma.project.findFirst({ where: { id: projectId, tenantId } }),
    ])
    if (!contractor) throw new Error('Empreiteiro não encontrado')
    if (!project) throw new Error('Projeto não encontrado')

    const contractorActivities = await this.prisma.contractorActivity.findMany({
      where: {
        contractorId,
        activity: { projectId },
      },
      include: {
        activity: {
          select: {
            id: true,
            name: true,
            level: true,
            parentId: true,
            order: true,
          },
        },
      },
    })

    return contractorActivities.map(ca => ({
      ...ca.activity,
      contractorActivityId: ca.id,
      projectActivityId: ca.projectActivityId,
    }))
  }

  async syncUnits(tenantId: string, contractorId: string, projectId: string, unitIds: string[]) {
    const [contractor, project] = await Promise.all([
      this.prisma.contractor.findFirst({ where: { id: contractorId, tenantId } }),
      this.prisma.project.findFirst({ where: { id: projectId, tenantId } }),
    ])
    if (!contractor) throw new Error('Empreiteiro não encontrado')
    if (!project) throw new Error('Projeto não encontrado')

    // Get current unit assignments for this contractor + project
    const current = await this.prisma.contractorUnit.findMany({
      where: {
        contractorId,
        unit: { projectId },
      },
      select: { id: true, unitId: true },
    })
    const currentIds = new Set(current.map(c => c.unitId))
    const newIds = new Set(unitIds)

    const toRemove = current.filter(c => !newIds.has(c.unitId))
    const toAdd = unitIds.filter(id => !currentIds.has(id))

    await this.prisma.$transaction(async (tx) => {
      if (toRemove.length > 0) {
        await tx.contractorUnit.deleteMany({
          where: { id: { in: toRemove.map(r => r.id) } },
        })
      }
      if (toAdd.length > 0) {
        await tx.contractorUnit.createMany({
          data: toAdd.map(unitId => ({
            contractorId,
            unitId,
          })),
          skipDuplicates: true,
        })
      }
    })

    return { message: 'Unidades sincronizadas com sucesso', added: toAdd.length, removed: toRemove.length }
  }

  async listUnitsByProject(tenantId: string, contractorId: string, projectId: string) {
    const [contractor, project] = await Promise.all([
      this.prisma.contractor.findFirst({ where: { id: contractorId, tenantId } }),
      this.prisma.project.findFirst({ where: { id: projectId, tenantId } }),
    ])
    if (!contractor) throw new Error('Empreiteiro não encontrado')
    if (!project) throw new Error('Projeto não encontrado')

    const contractorUnits = await this.prisma.contractorUnit.findMany({
      where: {
        contractorId,
        unit: { projectId },
      },
      include: {
        unit: {
          select: {
            id: true,
            code: true,
            type: true,
            floor: true,
            area: true,
            status: true,
            blockId: true,
            floorPlanId: true,
          },
        },
      },
    })

    return contractorUnits.map(cu => ({
      ...cu.unit,
      contractorUnitId: cu.id,
      unitId: cu.unitId,
    }))
  }

  async syncActivities(tenantId: string, contractorId: string, projectId: string, activityIds: string[]) {
    const [contractor, project] = await Promise.all([
      this.prisma.contractor.findFirst({ where: { id: contractorId, tenantId } }),
      this.prisma.project.findFirst({ where: { id: projectId, tenantId } }),
    ])
    if (!contractor) throw new Error('Empreiteiro não encontrado')
    if (!project) throw new Error('Projeto não encontrado')

    // Get current activity assignments for this contractor + project
    const current = await this.prisma.contractorActivity.findMany({
      where: {
        contractorId,
        activity: { projectId },
      },
      select: { id: true, projectActivityId: true },
    })
    const currentIds = new Set(current.map(c => c.projectActivityId))
    const newIds = new Set(activityIds)

    // To remove: in current but not in new
    const toRemove = current.filter(c => !newIds.has(c.projectActivityId))
    // To add: in new but not in current
    const toAdd = activityIds.filter(id => !currentIds.has(id))

    await this.prisma.$transaction(async (tx) => {
      if (toRemove.length > 0) {
        await tx.contractorActivity.deleteMany({
          where: { id: { in: toRemove.map(r => r.id) } },
        })
      }
      if (toAdd.length > 0) {
        await tx.contractorActivity.createMany({
          data: toAdd.map(activityId => ({
            contractorId,
            projectActivityId: activityId,
          })),
          skipDuplicates: true,
        })
      }
    })

    return { message: 'Atividades sincronizadas com sucesso', added: toAdd.length, removed: toRemove.length }
  }

  private serialize(contractor: any) {
    return {
      ...contractor,
      rating: contractor.rating ? Number(contractor.rating) : null,
    }
  }
}
