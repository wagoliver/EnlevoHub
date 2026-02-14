import { PrismaClient, Prisma } from '@prisma/client'
import {
  CreateMeasurementInput,
  CreateBatchMeasurementInput,
  ReviewMeasurementInput,
  ListMeasurementsQuery,
} from './project-activity.schemas'
import { ContractorScope } from '../../core/rbac/contractor-filter'

export class MeasurementService {
  constructor(private prisma: PrismaClient) {}

  async listByProject(tenantId: string, projectId: string, query: ListMeasurementsQuery, scope?: ContractorScope) {
    const { page, limit, status, activityId, contractorId } = query
    const skip = (page - 1) * limit

    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    const where: Prisma.MeasurementWhereInput = {
      tenantId,
      activity: { projectId },
      ...(status && { status }),
      ...(activityId && { activityId }),
      ...(contractorId && { contractorId }),
      // CONTRACTOR: only their own measurements
      ...(scope?.contractorId && { contractorId: scope.contractorId }),
    }

    const [measurements, total] = await Promise.all([
      this.prisma.measurement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          activity: { select: { id: true, name: true } },
          unitActivity: {
            include: {
              unit: { select: { id: true, code: true } },
            },
          },
          contractor: { select: { id: true, name: true } },
          reporter: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
        },
      }),
      this.prisma.measurement.count({ where }),
    ])

    return {
      data: measurements.map(m => this.serialize(m)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  async getById(tenantId: string, projectId: string, measurementId: string) {
    const measurement = await this.prisma.measurement.findFirst({
      where: {
        id: measurementId,
        tenantId,
        activity: { projectId },
      },
      include: {
        activity: { select: { id: true, name: true } },
        unitActivity: {
          include: {
            unit: { select: { id: true, code: true, type: true } },
          },
        },
        contractor: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
        reviewer: { select: { id: true, name: true } },
      },
    })

    if (!measurement) throw new Error('Medição não encontrada')

    return this.serialize(measurement)
  }

  async create(
    tenantId: string,
    projectId: string,
    userId: string,
    data: CreateMeasurementInput,
    scope?: ContractorScope
  ) {
    // Verify activity belongs to project in tenant
    const activity = await this.prisma.projectActivity.findFirst({
      where: { id: data.activityId, project: { id: projectId, tenantId } },
    })
    if (!activity) throw new Error('Atividade não encontrada')

    // Resolve unitId → UnitActivity (find-or-create)
    if (data.unitId && !data.unitActivityId) {
      let ua = await this.prisma.unitActivity.findUnique({
        where: { activityId_unitId: { activityId: data.activityId, unitId: data.unitId } },
      })
      if (!ua) {
        ua = await this.prisma.unitActivity.create({
          data: { activityId: data.activityId, unitId: data.unitId },
        })
      }
      data.unitActivityId = ua.id
    }

    // Get previous progress
    let previousProgress = 0
    if (data.unitActivityId) {
      const ua = await this.prisma.unitActivity.findUnique({
        where: { id: data.unitActivityId },
      })
      if (!ua) throw new Error('Atividade de unidade não encontrada')
      previousProgress = Number(ua.progress)
    }

    // Auto-set contractorId for CONTRACTOR users
    const effectiveContractorId = scope?.contractorId || data.contractorId || null

    const measurement = await this.prisma.measurement.create({
      data: {
        tenantId,
        activityId: data.activityId,
        unitActivityId: data.unitActivityId || null,
        contractorId: effectiveContractorId,
        reportedBy: userId,
        progress: data.progress,
        previousProgress,
        notes: data.notes,
        photos: data.photos || Prisma.JsonNull,
        status: 'PENDING',
      },
      include: {
        activity: { select: { id: true, name: true } },
        unitActivity: {
          include: {
            unit: { select: { id: true, code: true } },
          },
        },
        contractor: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true } },
      },
    })

    return this.serialize(measurement)
  }

  async createBatch(
    tenantId: string,
    projectId: string,
    userId: string,
    data: CreateBatchMeasurementInput,
    scope?: ContractorScope
  ) {
    // Verify project belongs to tenant
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId },
    })
    if (!project) throw new Error('Projeto não encontrado')

    // Fetch all referenced unitActivities to get previousProgress
    const unitActivityIds = data.items.map(i => i.unitActivityId)
    const unitActivities = await this.prisma.unitActivity.findMany({
      where: { id: { in: unitActivityIds } },
    })
    const uaMap = new Map(unitActivities.map(ua => [ua.id, ua]))

    // Filter items that actually changed
    const changedItems = data.items.filter(item => {
      const ua = uaMap.get(item.unitActivityId)
      if (!ua) return false
      return item.progress !== Number(ua.progress)
    })

    if (changedItems.length === 0) {
      return { count: 0 }
    }

    const effectiveContractorId = scope?.contractorId || data.contractorId || null

    const result = await this.prisma.$transaction(async (tx) => {
      const measurements = []
      for (const item of changedItems) {
        const ua = uaMap.get(item.unitActivityId)!
        const measurement = await tx.measurement.create({
          data: {
            tenantId,
            activityId: item.activityId,
            unitActivityId: item.unitActivityId,
            contractorId: effectiveContractorId,
            reportedBy: userId,
            progress: item.progress,
            previousProgress: Number(ua.progress),
            notes: data.notes,
            photos: Prisma.JsonNull,
            status: 'PENDING',
          },
        })
        measurements.push(measurement)
      }
      return measurements
    })

    return { count: result.length }
  }

  async review(
    tenantId: string,
    projectId: string,
    measurementId: string,
    userId: string,
    data: ReviewMeasurementInput
  ) {
    const measurement = await this.prisma.measurement.findFirst({
      where: {
        id: measurementId,
        tenantId,
        activity: { projectId },
        status: 'PENDING',
      },
    })

    if (!measurement) throw new Error('Medição não encontrada ou já revisada')

    return this.prisma.$transaction(async (tx) => {
      // Update measurement status
      const updated = await tx.measurement.update({
        where: { id: measurementId },
        data: {
          status: data.status,
          reviewedBy: userId,
          reviewedAt: new Date(),
          reviewNotes: data.reviewNotes,
        },
        include: {
          activity: { select: { id: true, name: true } },
          unitActivity: {
            include: {
              unit: { select: { id: true, code: true } },
            },
          },
          contractor: { select: { id: true, name: true } },
          reporter: { select: { id: true, name: true } },
          reviewer: { select: { id: true, name: true } },
        },
      })

      // If approved, update UnitActivity progress
      if (data.status === 'APPROVED' && measurement.unitActivityId) {
        await tx.unitActivity.update({
          where: { id: measurement.unitActivityId },
          data: {
            progress: measurement.progress,
            status: Number(measurement.progress) >= 100 ? 'COMPLETED' : 'IN_PROGRESS',
          },
        })

        // Recalculate activity status
        const allUnitActivities = await tx.unitActivity.findMany({
          where: { activityId: measurement.activityId },
        })

        const allCompleted = allUnitActivities.every(
          ua => Number(ua.progress) >= 100
        )
        const anyStarted = allUnitActivities.some(
          ua => Number(ua.progress) > 0
        )

        await tx.projectActivity.update({
          where: { id: measurement.activityId },
          data: {
            status: allCompleted ? 'COMPLETED' : anyStarted ? 'IN_PROGRESS' : 'PENDING',
          },
        })

        // Auto-transition project status
        const project = await tx.project.findUnique({
          where: { id: projectId },
          select: { status: true },
        })

        if (project && project.status !== 'PAUSED' && project.status !== 'CANCELLED') {
          const allActivities = await tx.projectActivity.findMany({
            where: { projectId, parentId: null },
            select: { status: true },
          })

          if (allActivities.length > 0) {
            const allActivitiesCompleted = allActivities.every(a => a.status === 'COMPLETED')
            const anyActivityStarted = allActivities.some(a => a.status === 'IN_PROGRESS' || a.status === 'COMPLETED')

            if (allActivitiesCompleted && project.status !== 'COMPLETED') {
              await tx.project.update({
                where: { id: projectId },
                data: { status: 'COMPLETED', actualEndDate: new Date() },
              })
            } else if (anyActivityStarted && project.status === 'PLANNING') {
              await tx.project.update({
                where: { id: projectId },
                data: { status: 'IN_PROGRESS' },
              })
            }
          }
        }
      }

      return this.serialize(updated)
    })
  }

  private serialize(measurement: any) {
    return {
      ...measurement,
      progress: Number(measurement.progress),
      previousProgress: Number(measurement.previousProgress),
    }
  }
}
