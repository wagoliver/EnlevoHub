import { Navigate, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  Activity,
  Timer,
  AlertTriangle,
  Server,
  Database,
  BarChart3,
  Users,
  Shield,
  HardDrive,
  FolderOpen,
  ImageIcon,
  ArrowLeft,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useRole } from '@/hooks/usePermission'
import { monitoringAPI, tenantAPI } from '@/lib/api-client'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

function KPICard({ title, value, subtitle, icon: Icon, variant }: {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ElementType
  variant?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const variantClasses = {
    default: 'text-blue-600 bg-blue-50',
    success: 'text-green-600 bg-green-50',
    warning: 'text-amber-600 bg-amber-50',
    danger: 'text-red-600 bg-red-50',
  }
  const cls = variantClasses[variant || 'default']

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${cls}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Aba: Visão Geral ───

function OverviewTab() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['monitoring', 'overview'],
    queryFn: () => monitoringAPI.getOverview(),
    refetchInterval: 30_000,
  })

  const { data: timeseries } = useQuery({
    queryKey: ['monitoring', 'timeseries'],
    queryFn: () => monitoringAPI.getHttpTimeseries(60),
    refetchInterval: 30_000,
  })

  if (isLoading || !overview) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
  }

  const { system, http, database } = overview
  const errorRate = http.errorRate4xx + http.errorRate5xx

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Uptime do Servidor"
          value={system.uptimeFormatted}
          icon={Clock}
        />
        <KPICard
          title="Requisições/min"
          value={http.requestsPerMinute}
          subtitle={`${http.totalRequests} na última hora`}
          icon={Activity}
          variant="success"
        />
        <KPICard
          title="Tempo Médio"
          value={`${http.averageResponseTimeMs}ms`}
          subtitle={`p95: ${http.p95ResponseTimeMs}ms`}
          icon={Timer}
        />
        <KPICard
          title="Taxa de Erros"
          value={`${errorRate}%`}
          subtitle={`4xx: ${http.errorRate4xx}% | 5xx: ${http.errorRate5xx}%`}
          icon={AlertTriangle}
          variant={errorRate > 5 ? 'danger' : errorRate > 1 ? 'warning' : 'success'}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Requisições por Minuto</CardTitle>
          </CardHeader>
          <CardContent>
            {timeseries && timeseries.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={timeseries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="minute" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="requests" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="Requisições" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">Sem dados ainda</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Rotas</CardTitle>
          </CardHeader>
          <CardContent>
            {http.topRoutes.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={http.topRoutes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis dataKey="route" type="category" width={180} fontSize={10} tick={{ width: 170 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" name="Requisições" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">Sem dados ainda</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Memória</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Heap Used</span>
                <span>{system.memory.heapUsedMB} MB</span>
              </div>
              <Progress value={(system.memory.heapUsed / system.memory.heapTotal) * 100} />
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>RSS</span>
                <span>{system.memory.rssMB} MB</span>
              </div>
              <Progress value={Math.min((system.memory.rss / (system.memory.heapTotal * 1.5)) * 100, 100)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">CPU</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-center mt-4">{system.cpu.percentEstimate}%</div>
            <p className="text-center text-sm text-muted-foreground mt-2">Uso estimado de CPU</p>
            <Progress value={Math.min(system.cpu.percentEstimate, 100)} className="mt-4" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conexões DB</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Ativas</span>
              <span className="font-medium">{database.connectionPool.active}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Ociosas</span>
              <span className="font-medium">{database.connectionPool.idle}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total / Max</span>
              <span className="font-medium">{database.connectionPool.total} / {database.connectionPool.maxConnections}</span>
            </div>
            <Progress value={(database.connectionPool.total / database.connectionPool.maxConnections) * 100} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Aba: Sistema ───

function SystemTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'system'],
    queryFn: () => monitoringAPI.getSystem(),
    refetchInterval: 30_000,
  })

  if (isLoading || !data) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard title="Uptime" value={data.uptimeFormatted} icon={Clock} />
        <KPICard title="Node.js" value={data.nodeVersion} icon={Server} />
        <KPICard title="Plataforma" value={data.platform} icon={Server} />
        <KPICard title="Event Loop Lag" value={`${data.eventLoopLagMs}ms`} icon={Activity} variant={data.eventLoopLagMs > 50 ? 'danger' : 'success'} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uso de Memória</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: 'Heap Used', valueMB: data.memory.heapUsedMB, raw: data.memory.heapUsed, max: data.memory.heapTotal },
            { label: 'Heap Total', valueMB: data.memory.heapTotalMB, raw: data.memory.heapTotal, max: data.memory.rss },
            { label: 'RSS', valueMB: data.memory.rssMB, raw: data.memory.rss, max: data.memory.rss * 1.2 },
            { label: 'External', valueMB: data.memory.externalMB, raw: data.memory.external, max: data.memory.heapTotal },
          ].map((item) => (
            <div key={item.label}>
              <div className="flex justify-between text-sm mb-1">
                <span>{item.label}</span>
                <span className="font-medium">{item.valueMB} MB</span>
              </div>
              <Progress value={Math.min((item.raw / item.max) * 100, 100)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Informações do Processo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">PID:</span>
              <span className="ml-2 font-mono">{data.pid}</span>
            </div>
            <div>
              <span className="text-muted-foreground">CPU:</span>
              <span className="ml-2">{data.cpu.percentEstimate}%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Aba: Banco de Dados ───

function DatabaseTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'database'],
    queryFn: () => monitoringAPI.getDatabase(),
    refetchInterval: 30_000,
  })

  if (isLoading || !data) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <KPICard title="Tamanho do DB" value={`${data.sizeMB} MB`} icon={Database} />
        <KPICard title="Conexões Ativas" value={data.connectionPool.active} subtitle={`Total: ${data.connectionPool.total}`} icon={Activity} />
        <KPICard title="Max Conexões" value={data.connectionPool.maxConnections} icon={Server} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pool de Conexões</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center mb-3">
            <div className="flex-1 h-6 rounded-full overflow-hidden bg-gray-100 flex">
              {data.connectionPool.active > 0 && (
                <div
                  className="bg-blue-500 h-full transition-all"
                  style={{ width: `${(data.connectionPool.active / data.connectionPool.maxConnections) * 100}%` }}
                />
              )}
              {data.connectionPool.idle > 0 && (
                <div
                  className="bg-amber-400 h-full transition-all"
                  style={{ width: `${(data.connectionPool.idle / data.connectionPool.maxConnections) * 100}%` }}
                />
              )}
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-blue-500" />
              <span>Ativas ({data.connectionPool.active})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-amber-400" />
              <span>Ociosas ({data.connectionPool.idle})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-100" />
              <span>Disponíveis ({data.connectionPool.maxConnections - data.connectionPool.total})</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tabelas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tabela</TableHead>
                <TableHead className="text-right">Linhas</TableHead>
                <TableHead className="text-right">Tamanho (MB)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.tableStats.map((t: any) => (
                <TableRow key={t.table}>
                  <TableCell className="font-mono text-sm">{t.table}</TableCell>
                  <TableCell className="text-right">{t.rows.toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">{t.sizeMB}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Aba: Aplicação ───

function ApplicationTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'application'],
    queryFn: () => monitoringAPI.getApplication(),
    refetchInterval: 30_000,
  })

  if (isLoading || !data) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard title="Tenants" value={data.tenants} icon={Users} />
        <KPICard title="Usuários" value={data.users.total} icon={Users} variant="success" />
        <KPICard title="Projetos" value={data.projects.total} icon={BarChart3} />
        <KPICard title="Empreiteiros" value={data.contractors} icon={Users} variant="warning" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Projetos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {data.projects.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.projects.byStatus}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ status, count }: any) => `${status} (${count})`}
                  >
                    {data.projects.byStatus.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários por Role</CardTitle>
          </CardHeader>
          <CardContent>
            {data.users.byRole.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={data.users.byRole}
                    dataKey="count"
                    nameKey="role"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ role, count }: any) => `${role} (${count})`}
                  >
                    {data.users.byRole.map((_: any, i: number) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Medições Pendentes</p>
                <p className="text-2xl font-bold mt-1">{data.measurements.pending}</p>
                <p className="text-xs text-muted-foreground">de {data.measurements.total} total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Transações do Mês</p>
                <p className="text-2xl font-bold mt-1">{data.transactions.thisMonth}</p>
                <p className="text-xs text-muted-foreground">de {data.transactions.total} total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// ─── Aba: Tenants ───

function TenantsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'tenants'],
    queryFn: () => monitoringAPI.getTenants(),
    refetchInterval: 30_000,
  })

  if (isLoading || !data) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Uso por Tenant</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tenant</TableHead>
              <TableHead className="text-right">Usuários</TableHead>
              <TableHead className="text-right">Projetos</TableHead>
              <TableHead className="text-right">Empreiteiros</TableHead>
              <TableHead className="text-right">Medições</TableHead>
              <TableHead className="text-right">Criado em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((t: any) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell className="text-right">{t.users}</TableCell>
                <TableCell className="text-right">{t.projects}</TableCell>
                <TableCell className="text-right">{t.contractors}</TableCell>
                <TableCell className="text-right">{t.measurements}</TableCell>
                <TableCell className="text-right">{new Date(t.createdAt).toLocaleDateString('pt-BR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

// ─── Aba: Auditoria ───

function AuditTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'audit'],
    queryFn: () => monitoringAPI.getAudit(7),
    refetchInterval: 30_000,
  })

  if (isLoading || !data) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <KPICard title="Ações Hoje" value={data.actionsToday} icon={Shield} />
        <KPICard title="Ações na Semana" value={data.actionsThisWeek} icon={Shield} variant="success" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ações por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            {data.actionsPerDay.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={data.actionsPerDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" fontSize={11} />
                  <YAxis fontSize={11} />
                  <Tooltip />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} name="Ações" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Usuários Mais Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            {data.mostActiveUsers.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={data.mostActiveUsers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" fontSize={11} />
                  <YAxis dataKey="name" type="category" width={120} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8b5cf6" name="Ações" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-sm text-muted-foreground">Sem dados</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Últimas 50 Ações</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Ação</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentActions.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell>{a.user}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      a.action === 'CREATE' ? 'bg-green-50 text-green-700' :
                      a.action === 'UPDATE' ? 'bg-blue-50 text-blue-700' :
                      a.action === 'DELETE' ? 'bg-red-50 text-red-700' :
                      'bg-gray-50 text-gray-700'
                    }`}>
                      {a.action}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{a.entity}</TableCell>
                  <TableCell className="text-sm">{new Date(a.createdAt).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="font-mono text-xs">{a.ipAddress || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Aba: Armazenamento ───

function StorageTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['monitoring', 'storage'],
    queryFn: () => monitoringAPI.getStorage(),
    refetchInterval: 30_000,
  })

  const { data: storageConfig } = useQuery({
    queryKey: ['storage-config'],
    queryFn: () => tenantAPI.getStorageConfig() as Promise<{ storagePath: string; source: string }>,
  })

  const { data: drives } = useQuery({
    queryKey: ['drives'],
    queryFn: () => tenantAPI.getDrives() as Promise<Array<{
      letter: string; label: string; type: string;
      totalGB: number; freeGB: number; usedPercent: number
    }>>,
  })

  if (isLoading || !data) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
  }

  const { disk, storage, projects, storagePath } = data
  const diskBarColor = disk.warning === 'CRITICAL' ? 'bg-red-500' : disk.warning === 'WARNING' ? 'bg-amber-500' : 'bg-green-500'
  const diskTextColor = disk.warning === 'CRITICAL' ? 'text-red-600' : disk.warning === 'WARNING' ? 'text-amber-600' : 'text-green-600'

  const sourceLabel = storageConfig?.source === 'config'
    ? 'Arquivo de configuracao'
    : storageConfig?.source === 'env'
      ? 'Variavel de ambiente'
      : 'Padrao do sistema'

  const getDriveTypeBadge = (type: string) => {
    switch (type) {
      case 'local': return <Badge variant="planning">Local</Badge>
      case 'network': return <Badge variant="inProgress">Rede</Badge>
      case 'removable': return <Badge variant="paused">Removivel</Badge>
      default: return <Badge variant="outline">Outro</Badge>
    }
  }

  const getUsageColor = (percent: number) => {
    if (percent > 90) return 'text-red-600'
    if (percent > 75) return 'text-amber-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Espaço Livre"
          value={`${disk.freeGB} GB`}
          subtitle={`de ${disk.totalGB} GB total`}
          icon={HardDrive}
          variant={disk.warning === 'CRITICAL' ? 'danger' : disk.warning === 'WARNING' ? 'warning' : 'success'}
        />
        <KPICard
          title="Arquivos Armazenados"
          value={storage.totalFiles}
          subtitle={`${storage.totalSizeMB} MB total`}
          icon={ImageIcon}
        />
        <KPICard
          title="Projetos com Fotos"
          value={storage.projectCount}
          icon={FolderOpen}
        />
        <KPICard
          title="Uso do Disco"
          value={`${disk.usedPercent}%`}
          subtitle={disk.warning !== 'OK' ? disk.warning : undefined}
          icon={HardDrive}
          variant={disk.warning === 'CRITICAL' ? 'danger' : disk.warning === 'WARNING' ? 'warning' : 'success'}
        />
      </div>

      {/* Configuracao Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuracao de Armazenamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Caminho configurado:</span>
            <code className="rounded bg-neutral-100 px-3 py-1.5 text-sm font-mono">
              {storageConfig?.storagePath || storagePath}
            </code>
            <Badge variant="outline">{sourceLabel}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Unidades Disponiveis */}
      {drives && drives.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Unidades Disponiveis no Servidor</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Livre</TableHead>
                  <TableHead>Uso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drives.map((drive) => (
                  <TableRow key={drive.letter}>
                    <TableCell className="font-mono font-medium">{drive.letter}</TableCell>
                    <TableCell>{drive.label}</TableCell>
                    <TableCell>{getDriveTypeBadge(drive.type)}</TableCell>
                    <TableCell className="text-right">{drive.totalGB.toFixed(1)} GB</TableCell>
                    <TableCell className="text-right">{drive.freeGB.toFixed(1)} GB</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-[120px]">
                        <Progress value={drive.usedPercent} className="h-2 flex-1" />
                        <span className={`text-xs font-medium ${getUsageColor(drive.usedPercent)}`}>
                          {drive.usedPercent.toFixed(1)}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Uso do Disco</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-center">
            <div className="flex-1 h-6 rounded-full overflow-hidden bg-gray-100 flex">
              <div
                className={`${diskBarColor} h-full transition-all`}
                style={{ width: `${Math.min(disk.usedPercent, 100)}%` }}
              />
            </div>
          </div>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded ${diskBarColor}`} />
              <span>Usado ({disk.usedGB} GB)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-gray-100" />
              <span>Livre ({disk.freeGB} GB)</span>
            </div>
            <div className="ml-auto">
              <span className="text-muted-foreground">Total: {disk.totalGB} GB</span>
            </div>
          </div>
          <div className={`text-sm font-medium ${diskTextColor}`}>
            {disk.warning === 'CRITICAL' && 'ALERTA: Disco quase cheio! Libere espaço urgentemente.'}
            {disk.warning === 'WARNING' && 'ATENÇÃO: Disco acima de 75% de uso.'}
            {disk.warning === 'OK' && 'Espaço em disco dentro do normal.'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 20 Projetos por Tamanho</CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Projeto ID</TableHead>
                  <TableHead className="text-right">Arquivos</TableHead>
                  <TableHead className="text-right">Tamanho (MB)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p: any) => (
                  <TableRow key={p.projectId}>
                    <TableCell className="font-mono text-sm">{p.projectId}</TableCell>
                    <TableCell className="text-right">{p.fileCount}</TableCell>
                    <TableCell className="text-right">{p.sizeMB}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              Nenhum arquivo armazenado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Página Principal ───

export function Performance() {
  const role = useRole()
  const navigate = useNavigate()

  if (role !== 'ROOT') {
    return <Navigate to="/" replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Performance</h1>
        <p className="text-muted-foreground">Monitoramento do sistema em tempo real</p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
          <TabsTrigger value="database">Banco de Dados</TabsTrigger>
          <TabsTrigger value="application">Aplicação</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="audit">Auditoria</TabsTrigger>
          <TabsTrigger value="storage">Armazenamento</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab />
        </TabsContent>
        <TabsContent value="system" className="mt-6">
          <SystemTab />
        </TabsContent>
        <TabsContent value="database" className="mt-6">
          <DatabaseTab />
        </TabsContent>
        <TabsContent value="application" className="mt-6">
          <ApplicationTab />
        </TabsContent>
        <TabsContent value="tenants" className="mt-6">
          <TenantsTab />
        </TabsContent>
        <TabsContent value="audit" className="mt-6">
          <AuditTab />
        </TabsContent>
        <TabsContent value="storage" className="mt-6">
          <StorageTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
