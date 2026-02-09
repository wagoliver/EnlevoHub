import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'

function resolveStorageBasePath(): string {
  return process.env.STORAGE_PATH
    ? path.resolve(process.env.STORAGE_PATH)
    : path.resolve(process.cwd(), 'storage')
}

export class MonitoringService {
  constructor(private prisma: PrismaClient) {}

  async getDatabaseMetrics() {
    const [sizeResult, connectionResult, tableStats] = await Promise.all([
      this.prisma.$queryRaw<[{ size: bigint }]>`
        SELECT pg_database_size(current_database()) as size
      `,
      this.prisma.$queryRaw<Array<{ state: string | null; count: bigint }>>`
        SELECT state, COUNT(*)::bigint as count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY state
      `,
      this.prisma.$queryRaw<Array<{
        relname: string
        n_live_tup: bigint
        pg_total_relation_size: bigint
      }>>`
        SELECT
          relname,
          n_live_tup,
          pg_total_relation_size(quote_ident(schemaname) || '.' || quote_ident(relname))
        FROM pg_stat_user_tables
        WHERE schemaname = 'public'
        ORDER BY n_live_tup DESC
        LIMIT 15
      `,
    ])

    const maxConnResult = await this.prisma.$queryRaw<[{ max_connections: string }]>`
      SHOW max_connections
    `

    const sizeMB = Number(sizeResult[0].size) / (1024 * 1024)
    const maxConnections = parseInt(maxConnResult[0].max_connections, 10)

    let active = 0
    let idle = 0
    let total = 0
    for (const row of connectionResult) {
      const count = Number(row.count)
      total += count
      if (row.state === 'active') active += count
      else if (row.state === 'idle') idle += count
    }

    return {
      sizeMB: Math.round(sizeMB * 100) / 100,
      connectionPool: { active, idle, total, maxConnections },
      tableStats: tableStats.map((t) => ({
        table: t.relname,
        rows: Number(t.n_live_tup),
        sizeMB: Math.round((Number(t.pg_total_relation_size) / (1024 * 1024)) * 100) / 100,
      })),
    }
  }

  async getApplicationMetrics() {
    const [
      tenantCount,
      userCount,
      usersByRole,
      projectCount,
      projectsByStatus,
      contractorCount,
      measurementCount,
      pendingMeasurements,
      transactionCount,
      transactionsThisMonth,
    ] = await Promise.all([
      this.prisma.tenant.count(),
      this.prisma.user.count(),
      this.prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      this.prisma.project.count(),
      this.prisma.project.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.contractor.count(),
      this.prisma.measurement.count(),
      this.prisma.measurement.count({ where: { status: 'PENDING' } }),
      this.prisma.financialTransaction.count(),
      this.prisma.financialTransaction.count({
        where: {
          date: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
          },
        },
      }),
    ])

    return {
      tenants: tenantCount,
      users: {
        total: userCount,
        byRole: usersByRole.map((r) => ({ role: r.role, count: r._count.id })),
      },
      projects: {
        total: projectCount,
        byStatus: projectsByStatus.map((s) => ({ status: s.status, count: s._count.id })),
      },
      contractors: contractorCount,
      measurements: {
        total: measurementCount,
        pending: pendingMeasurements,
      },
      transactions: {
        total: transactionCount,
        thisMonth: transactionsThisMonth,
      },
    }
  }

  async getTenantUsage() {
    const tenants = await this.prisma.tenant.findMany({
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            users: true,
            projects: true,
            contractors: true,
            measurements: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      createdAt: t.createdAt,
      users: t._count.users,
      projects: t._count.projects,
      contractors: t._count.contractors,
      measurements: t._count.measurements,
    }))
  }

  async getAuditActivity(days: number) {
    const since = new Date()
    since.setDate(since.getDate() - days)
    since.setHours(0, 0, 0, 0)

    const [recentActions, actionsPerDay, mostActiveUsers, actionDistribution] = await Promise.all([
      this.prisma.auditLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      this.prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
        SELECT DATE_TRUNC('day', "createdAt") as day, COUNT(*)::bigint as count
        FROM audit_logs
        WHERE "createdAt" >= ${since}
        GROUP BY DATE_TRUNC('day', "createdAt")
        ORDER BY day ASC
      `,
      this.prisma.$queryRaw<Array<{ userId: string; name: string; count: bigint }>>`
        SELECT al."userId", u.name, COUNT(*)::bigint as count
        FROM audit_logs al
        JOIN users u ON u.id = al."userId"
        WHERE al."createdAt" >= ${since}
        GROUP BY al."userId", u.name
        ORDER BY count DESC
        LIMIT 10
      `,
      this.prisma.auditLog.groupBy({
        by: ['action'],
        _count: { id: true },
        where: { createdAt: { gte: since } },
      }),
    ])

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    weekAgo.setHours(0, 0, 0, 0)

    const actionsToday = await this.prisma.auditLog.count({
      where: { createdAt: { gte: today } },
    })
    const actionsThisWeek = await this.prisma.auditLog.count({
      where: { createdAt: { gte: weekAgo } },
    })

    return {
      actionsToday,
      actionsThisWeek,
      recentActions: recentActions.map((a) => ({
        id: a.id,
        user: a.user.name || a.user.email,
        action: a.action,
        entity: a.entity,
        entityId: a.entityId,
        ipAddress: a.ipAddress,
        createdAt: a.createdAt,
      })),
      actionsPerDay: actionsPerDay.map((d) => ({
        day: d.day.toISOString().split('T')[0],
        count: Number(d.count),
      })),
      mostActiveUsers: mostActiveUsers.map((u) => ({
        userId: u.userId,
        name: u.name,
        count: Number(u.count),
      })),
      actionDistribution: actionDistribution.map((a) => ({
        action: a.action,
        count: a._count.id,
      })),
    }
  }

  async getStorageMetrics() {
    const storagePath = resolveStorageBasePath()
    const uploadsDir = path.join(storagePath, 'uploads', 'projects')

    // Disk usage
    const disk = this.getDiskUsage(storagePath)

    // Storage files stats
    const projectStats: Array<{ projectId: string; fileCount: number; sizeMB: number }> = []
    let totalFiles = 0
    let totalSizeBytes = 0

    if (fs.existsSync(uploadsDir)) {
      try {
        const projectDirs = fs.readdirSync(uploadsDir, { withFileTypes: true })
        for (const dir of projectDirs) {
          if (!dir.isDirectory()) continue
          const projectDir = path.join(uploadsDir, dir.name)
          const files = fs.readdirSync(projectDir)
          let projectSize = 0
          for (const file of files) {
            try {
              const stat = fs.statSync(path.join(projectDir, file))
              if (stat.isFile()) {
                projectSize += stat.size
              }
            } catch {
              // skip inaccessible files
            }
          }
          totalFiles += files.length
          totalSizeBytes += projectSize
          projectStats.push({
            projectId: dir.name,
            fileCount: files.length,
            sizeMB: Math.round((projectSize / (1024 * 1024)) * 100) / 100,
          })
        }
      } catch {
        // uploadsDir may not exist yet
      }
    }

    // Sort by size desc, top 20
    projectStats.sort((a, b) => b.sizeMB - a.sizeMB)
    const topProjects = projectStats.slice(0, 20)

    return {
      storagePath,
      disk,
      storage: {
        totalFiles,
        totalSizeMB: Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100,
        projectCount: projectStats.length,
      },
      projects: topProjects,
    }
  }

  private getDiskUsage(targetPath: string): {
    totalGB: number
    freeGB: number
    usedGB: number
    usedPercent: number
    warning: 'OK' | 'WARNING' | 'CRITICAL'
  } {
    try {
      const isWindows = process.platform === 'win32'
      let totalGB = 0
      let freeGB = 0

      if (isWindows) {
        const drive = path.resolve(targetPath).substring(0, 2) // e.g. "D:"
        const output = execSync(
          `wmic logicaldisk where "DeviceID='${drive}'" get FreeSpace,Size /format:csv`,
          { encoding: 'utf8', timeout: 5000 }
        )
        const lines = output.trim().split('\n').filter((l) => l.trim().length > 0)
        const lastLine = lines[lines.length - 1]
        const parts = lastLine.split(',')
        // CSV format: Node,FreeSpace,Size
        if (parts.length >= 3) {
          freeGB = parseInt(parts[1], 10) / (1024 * 1024 * 1024)
          totalGB = parseInt(parts[2], 10) / (1024 * 1024 * 1024)
        }
      } else {
        const output = execSync(`df -B1 "${targetPath}" | tail -1`, {
          encoding: 'utf8',
          timeout: 5000,
        })
        const parts = output.trim().split(/\s+/)
        if (parts.length >= 4) {
          totalGB = parseInt(parts[1], 10) / (1024 * 1024 * 1024)
          freeGB = parseInt(parts[3], 10) / (1024 * 1024 * 1024)
        }
      }

      const usedGB = totalGB - freeGB
      const usedPercent = totalGB > 0 ? Math.round((usedGB / totalGB) * 10000) / 100 : 0

      let warning: 'OK' | 'WARNING' | 'CRITICAL' = 'OK'
      if (usedPercent > 90) warning = 'CRITICAL'
      else if (usedPercent > 75) warning = 'WARNING'

      return {
        totalGB: Math.round(totalGB * 100) / 100,
        freeGB: Math.round(freeGB * 100) / 100,
        usedGB: Math.round(usedGB * 100) / 100,
        usedPercent,
        warning,
      }
    } catch {
      return { totalGB: 0, freeGB: 0, usedGB: 0, usedPercent: 0, warning: 'OK' }
    }
  }
}
