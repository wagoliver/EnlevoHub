import {
  addDays,
  isWeekend,
  differenceInCalendarDays,
  parseISO,
  format,
  isBefore,
  isEqual,
} from 'date-fns'

export interface SchedulePhaseInput {
  name: string
  order: number
  percentageOfTotal: number
  color?: string
  stages: ScheduleStageInput[]
}

export interface ScheduleStageInput {
  name: string
  order: number
  activities: ScheduleActivityInput[]
}

export interface ScheduleActivityInput {
  name: string
  order: number
  weight: number
  durationDays?: number | null
  dependencies?: string[] | null
}

export interface ScheduleConfig {
  startDate: string // ISO date
  endDate: string   // ISO date
  mode: 'BUSINESS_DAYS' | 'CALENDAR_DAYS'
  holidays?: string[] // ISO dates
}

export interface ScheduledActivity {
  name: string
  level: 'PHASE' | 'STAGE' | 'ACTIVITY'
  order: number
  weight: number
  plannedStartDate: string
  plannedEndDate: string
  color?: string
  dependencies?: string[]
  children?: ScheduledActivity[]
}

export class SchedulingService {
  private holidaySet: Set<string> = new Set()

  private initHolidays(holidays?: string[]) {
    this.holidaySet = new Set(holidays?.map(h => {
      const d = typeof h === 'string' ? parseISO(h) : h
      return format(d, 'yyyy-MM-dd')
    }) || [])
  }

  private isHoliday(date: Date): boolean {
    return this.holidaySet.has(format(date, 'yyyy-MM-dd'))
  }

  private isWorkingDay(date: Date): boolean {
    return !isWeekend(date) && !this.isHoliday(date)
  }

  countBusinessDays(start: Date, end: Date): number {
    let count = 0
    let current = new Date(start)
    while (isBefore(current, end) || isEqual(current, end)) {
      if (this.isWorkingDay(current)) {
        count++
      }
      current = addDays(current, 1)
    }
    return count
  }

  addBusinessDays(start: Date, days: number): Date {
    if (days <= 0) return new Date(start)
    let current = new Date(start)
    let remaining = days
    while (remaining > 0) {
      current = addDays(current, 1)
      if (this.isWorkingDay(current)) {
        remaining--
      }
    }
    return current
  }

  addCalendarDays(start: Date, days: number): Date {
    return addDays(start, days)
  }

  private addDaysByMode(start: Date, days: number, mode: string): Date {
    if (mode === 'BUSINESS_DAYS') {
      return this.addBusinessDays(start, days)
    }
    return this.addCalendarDays(start, days)
  }

  private countDaysByMode(start: Date, end: Date, mode: string): number {
    if (mode === 'BUSINESS_DAYS') {
      return this.countBusinessDays(start, end)
    }
    return differenceInCalendarDays(end, start) + 1
  }

  /**
   * Distribute total days among phases based on percentage.
   * Last phase absorbs rounding remainder.
   */
  distributePhases(
    totalDays: number,
    phases: { percentageOfTotal: number }[]
  ): number[] {
    const dayAllocs: number[] = []
    let allocated = 0

    for (let i = 0; i < phases.length; i++) {
      if (i === phases.length - 1) {
        // Last phase gets the remainder
        dayAllocs.push(Math.max(1, totalDays - allocated))
      } else {
        const days = Math.max(1, Math.round(totalDays * phases[i].percentageOfTotal / 100))
        dayAllocs.push(days)
        allocated += days
      }
    }

    return dayAllocs
  }

  /**
   * Topological sort of activities by dependency names.
   * Returns activities in execution order.
   */
  topologicalSort<T extends { name: string; dependencies?: string[] | null }>(
    activities: T[]
  ): T[] {
    const nameToIndex = new Map<string, number>()
    activities.forEach((a, i) => nameToIndex.set(a.name, i))

    const inDegree = new Array(activities.length).fill(0)
    const adjList: number[][] = activities.map(() => [])

    activities.forEach((a, i) => {
      if (a.dependencies) {
        for (const dep of a.dependencies) {
          const depIdx = nameToIndex.get(dep)
          if (depIdx !== undefined) {
            adjList[depIdx].push(i)
            inDegree[i]++
          }
        }
      }
    })

    const queue: number[] = []
    inDegree.forEach((deg, i) => {
      if (deg === 0) queue.push(i)
    })

    const result: T[] = []
    while (queue.length > 0) {
      const idx = queue.shift()!
      result.push(activities[idx])
      for (const next of adjList[idx]) {
        inDegree[next]--
        if (inDegree[next] === 0) {
          queue.push(next)
        }
      }
    }

    // If there's a cycle, add remaining activities in original order
    if (result.length < activities.length) {
      const added = new Set(result.map(a => a.name))
      for (const a of activities) {
        if (!added.has(a.name)) {
          result.push(a)
        }
      }
    }

    return result
  }

  /**
   * Schedule activities within a phase, respecting dependencies.
   */
  scheduleActivitiesInPhase(
    phaseStart: Date,
    phaseDays: number,
    stages: ScheduleStageInput[],
    mode: string
  ): ScheduledActivity[] {
    // Collect all activities from all stages, keeping stage info
    const allActivities: (ScheduleActivityInput & { stageName: string; stageOrder: number })[] = []
    for (const stage of stages) {
      for (const act of stage.activities) {
        allActivities.push({ ...act, stageName: stage.name, stageOrder: stage.order })
      }
    }

    // Distribute days among activities by weight for those without fixed durationDays
    const fixedActivities = allActivities.filter(a => a.durationDays && a.durationDays > 0)
    const flexActivities = allActivities.filter(a => !a.durationDays || a.durationDays <= 0)

    const fixedDays = fixedActivities.reduce((sum, a) => sum + (a.durationDays || 0), 0)
    const remainingDays = Math.max(0, phaseDays - fixedDays)
    const totalFlexWeight = flexActivities.reduce((sum, a) => sum + a.weight, 0)

    // Assign duration to each activity
    const activityDurations = new Map<string, number>()
    for (const a of fixedActivities) {
      activityDurations.set(a.name, a.durationDays!)
    }

    let allocatedFlex = 0
    flexActivities.forEach((a, i) => {
      if (i === flexActivities.length - 1) {
        activityDurations.set(a.name, Math.max(1, remainingDays - allocatedFlex))
      } else {
        const days = totalFlexWeight > 0
          ? Math.max(1, Math.round(remainingDays * a.weight / totalFlexWeight))
          : 1
        activityDurations.set(a.name, days)
        allocatedFlex += days
      }
    })

    // Topological sort
    const sorted = this.topologicalSort(allActivities)

    // Schedule each activity
    const activitySchedule = new Map<string, { start: Date; end: Date }>()

    for (const act of sorted) {
      let actStart = new Date(phaseStart)

      // If has dependencies, start after the latest dependency ends
      if (act.dependencies && act.dependencies.length > 0) {
        for (const dep of act.dependencies) {
          const depSchedule = activitySchedule.get(dep)
          if (depSchedule) {
            const dayAfterDep = addDays(depSchedule.end, 1)
            if (mode === 'BUSINESS_DAYS') {
              // Skip to next working day
              let candidate = dayAfterDep
              while (!this.isWorkingDay(candidate)) {
                candidate = addDays(candidate, 1)
              }
              if (isBefore(actStart, candidate)) {
                actStart = candidate
              }
            } else {
              if (isBefore(actStart, dayAfterDep)) {
                actStart = dayAfterDep
              }
            }
          }
        }
      } else if (mode === 'BUSINESS_DAYS') {
        // Ensure start is a working day
        while (!this.isWorkingDay(actStart)) {
          actStart = addDays(actStart, 1)
        }
      }

      const duration = activityDurations.get(act.name) || 1
      // End date = start + (duration - 1) working/calendar days
      const actEnd = this.addDaysByMode(actStart, duration - 1, mode)

      activitySchedule.set(act.name, { start: actStart, end: actEnd })
    }

    // Group back into stages
    const stageMap = new Map<string, { stage: ScheduleStageInput; activities: ScheduledActivity[] }>()
    for (const stage of stages) {
      stageMap.set(stage.name, { stage, activities: [] })
    }

    for (const act of allActivities) {
      const schedule = activitySchedule.get(act.name)!
      const entry = stageMap.get(act.stageName)!
      entry.activities.push({
        name: act.name,
        level: 'ACTIVITY',
        order: act.order,
        weight: act.weight,
        plannedStartDate: format(schedule.start, 'yyyy-MM-dd'),
        plannedEndDate: format(schedule.end, 'yyyy-MM-dd'),
        dependencies: act.dependencies || undefined,
      })
    }

    // Build stage-level entries
    const scheduledStages: ScheduledActivity[] = []
    for (const stage of stages) {
      const entry = stageMap.get(stage.name)!
      const acts = entry.activities
      if (acts.length === 0) continue

      const stageStart = acts.reduce(
        (min, a) => {
          const d = parseISO(a.plannedStartDate)
          return isBefore(d, min) ? d : min
        },
        parseISO(acts[0].plannedStartDate)
      )
      const stageEnd = acts.reduce(
        (max, a) => {
          const d = parseISO(a.plannedEndDate)
          return isBefore(max, d) ? d : max
        },
        parseISO(acts[0].plannedEndDate)
      )

      scheduledStages.push({
        name: stage.name,
        level: 'STAGE',
        order: stage.order,
        weight: 1,
        plannedStartDate: format(stageStart, 'yyyy-MM-dd'),
        plannedEndDate: format(stageEnd, 'yyyy-MM-dd'),
        children: acts.sort((a, b) => a.order - b.order),
      })
    }

    return scheduledStages.sort((a, b) => a.order - b.order)
  }

  /**
   * Main method: calculate full schedule from template phases.
   */
  calculateSchedule(config: ScheduleConfig, phases: SchedulePhaseInput[]): ScheduledActivity[] {
    this.initHolidays(config.holidays)

    const startDate = parseISO(config.startDate)
    const endDate = parseISO(config.endDate)
    const mode = config.mode

    // 1. Calculate total days
    const totalDays = this.countDaysByMode(startDate, endDate, mode)

    // 2. Sort phases by order
    const sortedPhases = [...phases].sort((a, b) => a.order - b.order)

    // 3. Distribute days among phases by percentage
    const phaseAllocs = this.distributePhases(totalDays, sortedPhases)

    // 4. Schedule phases sequentially
    const result: ScheduledActivity[] = []
    let currentStart = new Date(startDate)

    // Ensure start is a working day if in BUSINESS_DAYS mode
    if (mode === 'BUSINESS_DAYS') {
      while (!this.isWorkingDay(currentStart)) {
        currentStart = addDays(currentStart, 1)
      }
    }

    for (let i = 0; i < sortedPhases.length; i++) {
      const phase = sortedPhases[i]
      const phaseDays = phaseAllocs[i]
      const phaseStart = new Date(currentStart)
      const phaseEnd = this.addDaysByMode(phaseStart, phaseDays - 1, mode)

      // Schedule activities within this phase
      const scheduledStages = this.scheduleActivitiesInPhase(
        phaseStart,
        phaseDays,
        phase.stages,
        mode
      )

      result.push({
        name: phase.name,
        level: 'PHASE',
        order: phase.order,
        weight: phase.percentageOfTotal,
        plannedStartDate: format(phaseStart, 'yyyy-MM-dd'),
        plannedEndDate: format(phaseEnd, 'yyyy-MM-dd'),
        color: phase.color,
        children: scheduledStages,
      })

      // Next phase starts the day after this one ends
      currentStart = addDays(phaseEnd, 1)
      if (mode === 'BUSINESS_DAYS') {
        while (!this.isWorkingDay(currentStart)) {
          currentStart = addDays(currentStart, 1)
        }
      }
    }

    return result
  }
}
