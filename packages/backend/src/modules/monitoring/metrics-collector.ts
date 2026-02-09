interface RequestMetric {
  timestamp: number
  method: string
  route: string
  statusCode: number
  responseTimeMs: number
}

interface HttpMetrics {
  totalRequests: number
  requestsPerMinute: number
  requestsPerHour: number
  averageResponseTimeMs: number
  p95ResponseTimeMs: number
  p99ResponseTimeMs: number
  errorRate4xx: number
  errorRate5xx: number
  statusCodeDistribution: Record<string, number>
  topRoutes: Array<{ route: string; count: number; avgResponseMs: number }>
}

interface SystemMetrics {
  uptime: number
  uptimeFormatted: string
  memory: {
    heapUsed: number
    heapTotal: number
    rss: number
    external: number
    heapUsedMB: string
    heapTotalMB: string
    rssMB: string
    externalMB: string
  }
  cpu: {
    user: number
    system: number
    percentEstimate: number
  }
  nodeVersion: string
  platform: string
  pid: number
}

interface TimeSeriesPoint {
  minute: string
  requests: number
  avgResponseMs: number
  errors: number
}

const MAX_BUFFER_SIZE = 10_000
const WINDOW_MS = 60 * 60 * 1000 // 1 hour

export class MetricsCollector {
  private static instance: MetricsCollector
  private buffer: RequestMetric[] = []
  private lastCpuUsage: NodeJS.CpuUsage | null = null
  private lastCpuTimestamp: number = 0

  private constructor() {
    this.lastCpuUsage = process.cpuUsage()
    this.lastCpuTimestamp = Date.now()
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector()
    }
    return MetricsCollector.instance
  }

  recordRequest(metric: RequestMetric): void {
    this.prune()
    this.buffer.push(metric)
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer = this.buffer.slice(this.buffer.length - MAX_BUFFER_SIZE)
    }
  }

  private prune(): void {
    const cutoff = Date.now() - WINDOW_MS
    const firstValid = this.buffer.findIndex((m) => m.timestamp >= cutoff)
    if (firstValid > 0) {
      this.buffer = this.buffer.slice(firstValid)
    } else if (firstValid === -1 && this.buffer.length > 0) {
      this.buffer = []
    }
  }

  getHttpMetrics(): HttpMetrics {
    this.prune()
    const metrics = this.buffer
    const total = metrics.length

    if (total === 0) {
      return {
        totalRequests: 0,
        requestsPerMinute: 0,
        requestsPerHour: 0,
        averageResponseTimeMs: 0,
        p95ResponseTimeMs: 0,
        p99ResponseTimeMs: 0,
        errorRate4xx: 0,
        errorRate5xx: 0,
        statusCodeDistribution: {},
        topRoutes: [],
      }
    }

    const now = Date.now()
    const oneMinuteAgo = now - 60_000
    const recentMinute = metrics.filter((m) => m.timestamp >= oneMinuteAgo)

    const responseTimes = metrics.map((m) => m.responseTimeMs).sort((a, b) => a - b)
    const avg = responseTimes.reduce((s, v) => s + v, 0) / total
    const p95 = responseTimes[Math.floor(0.95 * total)] || 0
    const p99 = responseTimes[Math.floor(0.99 * total)] || 0

    const count4xx = metrics.filter((m) => m.statusCode >= 400 && m.statusCode < 500).length
    const count5xx = metrics.filter((m) => m.statusCode >= 500).length

    const statusDist: Record<string, number> = {}
    for (const m of metrics) {
      const key = `${m.statusCode}`
      statusDist[key] = (statusDist[key] || 0) + 1
    }

    const routeMap = new Map<string, { count: number; totalMs: number }>()
    for (const m of metrics) {
      const entry = routeMap.get(m.route) || { count: 0, totalMs: 0 }
      entry.count++
      entry.totalMs += m.responseTimeMs
      routeMap.set(m.route, entry)
    }
    const topRoutes = Array.from(routeMap.entries())
      .map(([route, data]) => ({
        route,
        count: data.count,
        avgResponseMs: Math.round((data.totalMs / data.count) * 100) / 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      totalRequests: total,
      requestsPerMinute: recentMinute.length,
      requestsPerHour: total,
      averageResponseTimeMs: Math.round(avg * 100) / 100,
      p95ResponseTimeMs: Math.round(p95 * 100) / 100,
      p99ResponseTimeMs: Math.round(p99 * 100) / 100,
      errorRate4xx: Math.round((count4xx / total) * 10000) / 100,
      errorRate5xx: Math.round((count5xx / total) * 10000) / 100,
      statusCodeDistribution: statusDist,
      topRoutes,
    }
  }

  getSystemMetrics(): SystemMetrics {
    const mem = process.memoryUsage()
    const toMB = (bytes: number) => (bytes / 1024 / 1024).toFixed(2)

    const uptime = process.uptime()
    const days = Math.floor(uptime / 86400)
    const hours = Math.floor((uptime % 86400) / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const uptimeFormatted = `${days}d ${hours}h ${minutes}m`

    // CPU estimate
    const currentCpu = process.cpuUsage()
    const now = Date.now()
    let cpuPercent = 0

    if (this.lastCpuUsage) {
      const deltaUser = currentCpu.user - this.lastCpuUsage.user
      const deltaSystem = currentCpu.system - this.lastCpuUsage.system
      const deltaWall = (now - this.lastCpuTimestamp) * 1000 // convert ms to microseconds
      if (deltaWall > 0) {
        cpuPercent = Math.round(((deltaUser + deltaSystem) / deltaWall) * 100 * 100) / 100
      }
    }

    this.lastCpuUsage = currentCpu
    this.lastCpuTimestamp = now

    return {
      uptime,
      uptimeFormatted,
      memory: {
        heapUsed: mem.heapUsed,
        heapTotal: mem.heapTotal,
        rss: mem.rss,
        external: mem.external,
        heapUsedMB: toMB(mem.heapUsed),
        heapTotalMB: toMB(mem.heapTotal),
        rssMB: toMB(mem.rss),
        externalMB: toMB(mem.external),
      },
      cpu: {
        user: currentCpu.user,
        system: currentCpu.system,
        percentEstimate: cpuPercent,
      },
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
    }
  }

  async measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint()
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e6
        resolve(Math.round(lag * 100) / 100)
      })
    })
  }

  getRequestsTimeSeries(minutes: number): TimeSeriesPoint[] {
    this.prune()
    const now = Date.now()
    const cutoff = now - minutes * 60_000
    const relevant = this.buffer.filter((m) => m.timestamp >= cutoff)

    const buckets = new Map<string, { requests: number; totalMs: number; errors: number }>()

    for (const m of relevant) {
      const date = new Date(m.timestamp)
      const key = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      const bucket = buckets.get(key) || { requests: 0, totalMs: 0, errors: 0 }
      bucket.requests++
      bucket.totalMs += m.responseTimeMs
      if (m.statusCode >= 400) bucket.errors++
      buckets.set(key, bucket)
    }

    return Array.from(buckets.entries())
      .map(([minute, data]) => ({
        minute,
        requests: data.requests,
        avgResponseMs: Math.round((data.totalMs / data.requests) * 100) / 100,
        errors: data.errors,
      }))
      .sort((a, b) => a.minute.localeCompare(b.minute))
  }
}
