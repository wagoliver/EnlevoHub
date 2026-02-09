import { PrismaClient } from '@prisma/client'

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
}
