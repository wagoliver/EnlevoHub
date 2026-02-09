import { useQuery } from '@tanstack/react-query'
import { projectsAPI } from '@/lib/api-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Loader2, TrendingUp } from 'lucide-react'

const statusVariant: Record<string, any> = {
  PENDING: 'secondary',
  IN_PROGRESS: 'inProgress',
  COMPLETED: 'completed',
}

const statusLabel: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em Andamento',
  COMPLETED: 'Concluída',
}

interface ProgressOverviewProps {
  projectId: string
}

function ActivityProgressItem({ activity, depth = 0 }: { activity: any; depth?: number }) {
  const actProgress = activity.progress ?? 0
  const isPhase = activity.level === 'PHASE'
  const isStage = activity.level === 'STAGE'

  return (
    <div style={{ paddingLeft: depth * 16 }}>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {activity.color && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activity.color }}
              />
            )}
            <span className={`text-sm ${isPhase ? 'font-semibold' : isStage ? 'font-medium' : ''} text-neutral-700`}>
              {activity.name}
            </span>
            {isPhase && (
              <Badge variant="outline" className="text-xs">
                {activity.weight}%
              </Badge>
            )}
            {!isPhase && !isStage && (
              <Badge variant="outline" className="text-xs">
                Peso: {activity.weight}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activity.status && (
              <Badge
                variant={statusVariant[activity.status]}
                className="text-xs"
              >
                {statusLabel[activity.status] || activity.status}
              </Badge>
            )}
            <span className="text-sm font-medium w-10 text-right">
              {Math.round(actProgress)}%
            </span>
          </div>
        </div>
        <Progress value={actProgress} className={isPhase ? 'h-2.5' : 'h-2'} />
        {activity.unitCount != null && !isPhase && !isStage && (
          <p className="text-xs text-neutral-400">
            {activity.unitCount} unidade(s)
          </p>
        )}
      </div>

      {/* Render children */}
      {activity.children?.length > 0 && (
        <div className="mt-2 space-y-2">
          {activity.children.map((child: any) => (
            <ActivityProgressItem
              key={child.id}
              activity={child}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function ProgressOverview({ projectId }: ProgressOverviewProps) {
  const { data, isLoading } = useQuery({
    queryKey: ['project-progress', projectId],
    queryFn: () => projectsAPI.getProgress(projectId),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return null
  }

  const overallProgress = data.overallProgress ?? 0
  const activities = data.activities || []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">
          Progresso por Atividades
        </CardTitle>
        <TrendingUp className="h-4 w-4 text-neutral-500" />
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Overall Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-700">
              Progresso Geral
            </span>
            <span className="text-lg font-bold text-primary">
              {Math.round(overallProgress)}%
            </span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Activities List */}
        {activities.length === 0 ? (
          <p className="text-sm text-neutral-500 text-center py-4">
            Nenhuma atividade cadastrada
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map((activity: any) => (
              <ActivityProgressItem
                key={activity.id}
                activity={activity}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
