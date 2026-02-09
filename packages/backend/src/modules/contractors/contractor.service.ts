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

  private serialize(contractor: any) {
    return {
      ...contractor,
      rating: contractor.rating ? Number(contractor.rating) : null,
    }
  }
}
