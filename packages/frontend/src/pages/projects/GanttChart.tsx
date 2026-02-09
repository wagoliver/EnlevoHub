import { useMemo, useRef } from 'react'
import {
  differenceInCalendarDays,
  addDays,
  format,
  startOfDay,
  isBefore,
  isAfter,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { type GanttTask, flattenGanttTasks } from '@/lib/gantt-types'

interface GanttChartProps {
  tasks: GanttTask[]
}

const ROW_HEIGHT = 32
const HEADER_HEIGHT = 48
const LABEL_WIDTH = 250
const DAY_WIDTH = 24
const MIN_BAR_WIDTH = 4

export function GanttChart({ tasks }: GanttChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const flatTasks = useMemo(() => flattenGanttTasks(tasks), [tasks])

  // Calculate date range
  const { minDate, totalDays } = useMemo(() => {
    if (flatTasks.length === 0) {
      const today = startOfDay(new Date())
      return { minDate: today, maxDate: addDays(today, 30), totalDays: 30 }
    }

    let min = flatTasks[0].startDate
    let max = flatTasks[0].endDate

    for (const task of flatTasks) {
      if (isBefore(task.startDate, min)) min = task.startDate
      if (isAfter(task.endDate, max)) max = task.endDate
    }

    // Add padding
    min = addDays(startOfDay(min), -2)
    max = addDays(startOfDay(max), 5)

    return {
      minDate: min,
      maxDate: max,
      totalDays: differenceInCalendarDays(max, min) + 1,
    }
  }, [flatTasks])

  const chartWidth = totalDays * DAY_WIDTH
  const chartHeight = flatTasks.length * ROW_HEIGHT

  // Generate month headers
  const months = useMemo(() => {
    const result: { label: string; startX: number; width: number }[] = []
    let currentMonth = -1

    for (let i = 0; i < totalDays; i++) {
      const d = addDays(minDate, i)
      const month = d.getMonth()
      if (month !== currentMonth) {
        if (result.length > 0) {
          result[result.length - 1].width = i * DAY_WIDTH - result[result.length - 1].startX
        }
        result.push({
          label: format(d, 'MMM yyyy', { locale: ptBR }),
          startX: i * DAY_WIDTH,
          width: 0,
        })
        currentMonth = month
      }
    }
    if (result.length > 0) {
      result[result.length - 1].width = chartWidth - result[result.length - 1].startX
    }
    return result
  }, [minDate, totalDays, chartWidth])

  // Today line
  const todayOffset = useMemo(() => {
    const today = startOfDay(new Date())
    const offset = differenceInCalendarDays(today, minDate)
    if (offset >= 0 && offset <= totalDays) {
      return offset * DAY_WIDTH
    }
    return null
  }, [minDate, totalDays])

  // Build ID-based task map for dependencies
  const taskMap = useMemo(() => {
    const map = new Map<string, { task: GanttTask; rowIndex: number }>()
    flatTasks.forEach((t, i) => map.set(t.id, { task: t, rowIndex: i }))
    return map
  }, [flatTasks])

  if (flatTasks.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-neutral-500 text-sm">
        Nenhuma atividade com datas para exibir no Gantt
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex">
        {/* Left: Labels */}
        <div
          className="shrink-0 border-r bg-white z-10"
          style={{ width: LABEL_WIDTH }}
        >
          {/* Header */}
          <div
            className="border-b bg-neutral-100 px-3 flex items-center font-medium text-sm text-neutral-700"
            style={{ height: HEADER_HEIGHT }}
          >
            Atividade
          </div>
          {/* Rows */}
          {flatTasks.map((task) => {
            const indent = task.level === 'PHASE' ? 0 : task.level === 'STAGE' ? 16 : 32
            return (
              <div
                key={task.id}
                className="border-b flex items-center gap-1.5 text-xs text-neutral-700 truncate"
                style={{ height: ROW_HEIGHT, paddingLeft: indent + 8 }}
              >
                {task.color && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: task.color }}
                  />
                )}
                <span className={task.level === 'PHASE' ? 'font-semibold' : task.level === 'STAGE' ? 'font-medium' : ''}>
                  {task.name}
                </span>
              </div>
            )
          })}
        </div>

        {/* Right: Chart */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto">
          <svg
            width={chartWidth}
            height={HEADER_HEIGHT + chartHeight}
            className="block"
          >
            {/* Month headers */}
            {months.map((m, i) => (
              <g key={i}>
                <rect
                  x={m.startX}
                  y={0}
                  width={m.width}
                  height={HEADER_HEIGHT}
                  fill="#F5F5F5"
                  stroke="#E5E5E5"
                />
                <text
                  x={m.startX + m.width / 2}
                  y={HEADER_HEIGHT / 2 + 4}
                  textAnchor="middle"
                  className="text-[10px] fill-neutral-500 font-medium"
                  style={{ fontSize: 10 }}
                >
                  {m.label}
                </text>
              </g>
            ))}

            {/* Grid lines (weekends) */}
            {Array.from({ length: totalDays }, (_, i) => {
              const d = addDays(minDate, i)
              const dayOfWeek = d.getDay()
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
              if (!isWeekend) return null
              return (
                <rect
                  key={i}
                  x={i * DAY_WIDTH}
                  y={HEADER_HEIGHT}
                  width={DAY_WIDTH}
                  height={chartHeight}
                  fill="#FAFAFA"
                />
              )
            })}

            {/* Row separators */}
            {flatTasks.map((_, idx) => (
              <line
                key={idx}
                x1={0}
                y1={HEADER_HEIGHT + (idx + 1) * ROW_HEIGHT}
                x2={chartWidth}
                y2={HEADER_HEIGHT + (idx + 1) * ROW_HEIGHT}
                stroke="#F0F0F0"
              />
            ))}

            {/* Task bars */}
            {flatTasks.map((task, idx) => {
              const startOffset = differenceInCalendarDays(task.startDate, minDate)
              const duration = differenceInCalendarDays(task.endDate, task.startDate) + 1
              const x = startOffset * DAY_WIDTH
              const width = Math.max(MIN_BAR_WIDTH, duration * DAY_WIDTH - 2)
              const y = HEADER_HEIGHT + idx * ROW_HEIGHT + 6
              const barHeight = ROW_HEIGHT - 12
              const color = task.color || '#3B82F6'

              const isPhase = task.level === 'PHASE'
              const isStage = task.level === 'STAGE'

              if (isPhase) {
                // Phase: diamond markers at start and end
                return (
                  <g key={task.id}>
                    <rect
                      x={x}
                      y={y + barHeight / 2 - 2}
                      width={width}
                      height={4}
                      fill={color}
                      rx={1}
                    />
                    <polygon
                      points={`${x},${y + barHeight / 2} ${x + 5},${y + barHeight / 2 - 5} ${x + 10},${y + barHeight / 2} ${x + 5},${y + barHeight / 2 + 5}`}
                      fill={color}
                    />
                    <polygon
                      points={`${x + width - 10},${y + barHeight / 2} ${x + width - 5},${y + barHeight / 2 - 5} ${x + width},${y + barHeight / 2} ${x + width - 5},${y + barHeight / 2 + 5}`}
                      fill={color}
                    />
                  </g>
                )
              }

              if (isStage) {
                return (
                  <g key={task.id}>
                    <rect
                      x={x}
                      y={y + 2}
                      width={width}
                      height={barHeight - 4}
                      fill={color}
                      opacity={0.3}
                      rx={2}
                    />
                    <rect
                      x={x}
                      y={y + 2}
                      width={width * (task.progress / 100)}
                      height={barHeight - 4}
                      fill={color}
                      opacity={0.6}
                      rx={2}
                    />
                  </g>
                )
              }

              // Activity: full bar with progress
              return (
                <g key={task.id}>
                  <rect
                    x={x}
                    y={y}
                    width={width}
                    height={barHeight}
                    fill={color}
                    opacity={0.2}
                    rx={3}
                  />
                  <rect
                    x={x}
                    y={y}
                    width={Math.max(0, width * (task.progress / 100))}
                    height={barHeight}
                    fill={color}
                    opacity={0.8}
                    rx={3}
                  />
                  {width > 40 && (
                    <text
                      x={x + 4}
                      y={y + barHeight / 2 + 3}
                      className="fill-neutral-700"
                      style={{ fontSize: 9 }}
                    >
                      {Math.round(task.progress)}%
                    </text>
                  )}
                </g>
              )
            })}

            {/* Dependency arrows */}
            {flatTasks.map((task, idx) => {
              if (!task.dependencies?.length) return null
              return task.dependencies.map((depId) => {
                const dep = taskMap.get(depId)
                if (!dep) return null
                const depTask = dep.task
                const depRow = dep.rowIndex

                const depEndX = (differenceInCalendarDays(depTask.endDate, minDate) + 1) * DAY_WIDTH
                const depY = HEADER_HEIGHT + depRow * ROW_HEIGHT + ROW_HEIGHT / 2

                const taskStartX = differenceInCalendarDays(task.startDate, minDate) * DAY_WIDTH
                const taskY = HEADER_HEIGHT + idx * ROW_HEIGHT + ROW_HEIGHT / 2

                const midX = depEndX + 8

                return (
                  <g key={`${depId}-${task.id}`}>
                    <path
                      d={`M${depEndX},${depY} L${midX},${depY} L${midX},${taskY} L${taskStartX},${taskY}`}
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth={1}
                      markerEnd="url(#arrowhead)"
                    />
                  </g>
                )
              })
            })}

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <polygon points="0,0 6,3 0,6" fill="#94A3B8" />
              </marker>
            </defs>

            {/* Today line */}
            {todayOffset !== null && (
              <g>
                <line
                  x1={todayOffset}
                  y1={0}
                  x2={todayOffset}
                  y2={HEADER_HEIGHT + chartHeight}
                  stroke="#EF4444"
                  strokeWidth={1.5}
                  strokeDasharray="4,2"
                />
                <text
                  x={todayOffset + 3}
                  y={HEADER_HEIGHT - 4}
                  className="fill-red-500"
                  style={{ fontSize: 9, fontWeight: 600 }}
                >
                  Hoje
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}
