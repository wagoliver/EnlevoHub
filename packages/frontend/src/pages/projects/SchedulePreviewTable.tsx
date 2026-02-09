import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  ChevronRight,
  Calendar,
} from 'lucide-react'

interface ScheduledItem {
  name: string
  level: 'PHASE' | 'STAGE' | 'ACTIVITY'
  order: number
  weight: number
  plannedStartDate: string
  plannedEndDate: string
  color?: string
  dependencies?: string[]
  children?: ScheduledItem[]
}

interface SchedulePreviewTableProps {
  schedule: ScheduledItem[]
  onChange: (schedule: ScheduledItem[]) => void
}

function daysBetween(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.max(1, Math.round((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function ScheduleRow({
  item,
  depth,
  expanded,
  onToggle,
  onDateChange,
  path,
}: {
  item: ScheduledItem
  depth: number
  expanded: Set<string>
  onToggle: (key: string) => void
  onDateChange: (path: number[], field: 'plannedStartDate' | 'plannedEndDate', value: string) => void
  path: number[]
}) {
  const key = path.join('-')
  const hasChildren = item.children && item.children.length > 0
  const isOpen = expanded.has(key)
  const duration = daysBetween(item.plannedStartDate, item.plannedEndDate)

  const levelStyles: Record<string, string> = {
    PHASE: 'font-semibold bg-neutral-50',
    STAGE: 'font-medium bg-neutral-25',
    ACTIVITY: '',
  }

  return (
    <>
      <tr className={`border-b hover:bg-neutral-50/50 ${levelStyles[item.level] || ''}`}>
        {/* Name */}
        <td className="px-3 py-2" style={{ paddingLeft: `${depth * 24 + 12}px` }}>
          <div className="flex items-center gap-1.5">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 shrink-0"
                onClick={() => onToggle(key)}
              >
                {isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </Button>
            ) : (
              <span className="w-5" />
            )}
            {item.color && (
              <span
                className="inline-block w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-sm">{item.name}</span>
            {item.level !== 'ACTIVITY' && (
              <Badge variant="outline" className="text-[10px] ml-1">
                {item.level === 'PHASE' ? 'Fase' : 'Etapa'}
              </Badge>
            )}
          </div>
        </td>

        {/* Start Date */}
        <td className="px-2 py-2">
          {item.level === 'ACTIVITY' ? (
            <Input
              type="date"
              value={item.plannedStartDate}
              onChange={(e) => onDateChange(path, 'plannedStartDate', e.target.value)}
              className="h-7 text-xs w-[130px]"
            />
          ) : (
            <span className="text-xs text-neutral-600">{formatDate(item.plannedStartDate)}</span>
          )}
        </td>

        {/* End Date */}
        <td className="px-2 py-2">
          {item.level === 'ACTIVITY' ? (
            <Input
              type="date"
              value={item.plannedEndDate}
              onChange={(e) => onDateChange(path, 'plannedEndDate', e.target.value)}
              className="h-7 text-xs w-[130px]"
            />
          ) : (
            <span className="text-xs text-neutral-600">{formatDate(item.plannedEndDate)}</span>
          )}
        </td>

        {/* Duration */}
        <td className="px-2 py-2 text-center">
          <span className="text-xs text-neutral-600">{duration}d</span>
        </td>

        {/* Dependencies */}
        <td className="px-2 py-2">
          <div className="flex flex-wrap gap-0.5">
            {item.dependencies?.map((dep, i) => (
              <Badge key={i} variant="secondary" className="text-[10px]">
                {dep.length > 12 ? dep.slice(0, 12) + '…' : dep}
              </Badge>
            ))}
          </div>
        </td>
      </tr>

      {/* Children */}
      {isOpen && item.children?.map((child, childIdx) => (
        <ScheduleRow
          key={childIdx}
          item={child}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onDateChange={onDateChange}
          path={[...path, childIdx]}
        />
      ))}
    </>
  )
}

export function SchedulePreviewTable({ schedule, onChange }: SchedulePreviewTableProps) {
  // Start with all phases expanded
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    schedule.forEach((_, i) => {
      initial.add(String(i))
      // Also expand stages
      schedule[i].children?.forEach((_, j) => {
        initial.add(`${i}-${j}`)
      })
    })
    return initial
  })

  const onToggle = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const onDateChange = (
    path: number[],
    field: 'plannedStartDate' | 'plannedEndDate',
    value: string
  ) => {
    const newSchedule = JSON.parse(JSON.stringify(schedule)) as ScheduledItem[]

    // Navigate to the item
    let current: ScheduledItem[] = newSchedule
    let item: ScheduledItem | undefined
    for (let i = 0; i < path.length; i++) {
      item = current[path[i]]
      if (i < path.length - 1 && item.children) {
        current = item.children
      }
    }

    if (item) {
      ;(item as any)[field] = value
    }

    onChange(newSchedule)
  }

  if (schedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-neutral-500">
        <Calendar className="h-8 w-8 mb-2" />
        <p className="text-sm">Nenhum cronograma calculado</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-neutral-100">
            <th className="px-3 py-2 text-left font-medium text-neutral-700">Nome</th>
            <th className="px-2 py-2 text-left font-medium text-neutral-700 w-[140px]">Início</th>
            <th className="px-2 py-2 text-left font-medium text-neutral-700 w-[140px]">Fim</th>
            <th className="px-2 py-2 text-center font-medium text-neutral-700 w-[60px]">Dias</th>
            <th className="px-2 py-2 text-left font-medium text-neutral-700 w-[150px]">Dependências</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((item, idx) => (
            <ScheduleRow
              key={idx}
              item={item}
              depth={0}
              expanded={expanded}
              onToggle={onToggle}
              onDateChange={onDateChange}
              path={[idx]}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
