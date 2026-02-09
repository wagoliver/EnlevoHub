export interface GanttTask {
  id: string
  name: string
  level: 'PHASE' | 'STAGE' | 'ACTIVITY'
  startDate: Date
  endDate: Date
  progress: number
  color?: string
  dependencies?: string[]
  parentId?: string
  children?: GanttTask[]
}

export interface GanttConfig {
  startDate: Date
  endDate: Date
  dayWidth: number
  rowHeight: number
  headerHeight: number
}

export function flattenGanttTasks(tasks: GanttTask[]): GanttTask[] {
  const result: GanttTask[] = []
  const flatten = (items: GanttTask[]) => {
    for (const item of items) {
      result.push(item)
      if (item.children?.length) {
        flatten(item.children)
      }
    }
  }
  flatten(tasks)
  return result
}

export function activityToGanttTask(activity: any, parentColor?: string): GanttTask {
  return {
    id: activity.id,
    name: activity.name,
    level: activity.level || 'ACTIVITY',
    startDate: activity.plannedStartDate ? new Date(activity.plannedStartDate) : new Date(),
    endDate: activity.plannedEndDate ? new Date(activity.plannedEndDate) : new Date(),
    progress: activity.averageProgress ?? activity.progress ?? 0,
    color: activity.color || parentColor,
    dependencies: activity.dependencies ? (
      Array.isArray(activity.dependencies) ? activity.dependencies : []
    ) : undefined,
    parentId: activity.parentId,
    children: activity.children?.map((c: any) => activityToGanttTask(c, activity.color || parentColor)),
  }
}
