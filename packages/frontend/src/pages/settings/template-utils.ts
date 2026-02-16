import type { SinapiMapping } from './template-models'

export interface ParsedPhase {
  name: string
  order: number
  percentageOfTotal: number
  color: string | null
  stages: ParsedStage[]
}

export interface ParsedStage {
  name: string
  order: number
  activities: ParsedActivity[]
}

export interface ParsedActivity {
  name: string
  order: number
  weight: number
  durationDays: number | null
  dependencies: string[] | null
  sinapiCodigo?: string | null
  areaTipo?: string | null
  tags?: string[] | null
  padrao?: boolean | null
}

export interface ValidationError {
  row: number
  message: string
}

/**
 * Convert raw spreadsheet rows (array-of-arrays) to a structured ParsedPhase[] hierarchy.
 * Each row follows: [Fase, Percentual(%), Cor, Etapa, Atividade, Peso(1-5), Duração(dias), Dependências]
 */
export function rowsToPhases(rows: any[][], autoCalcPercentage: boolean): { phases: ParsedPhase[]; errors: ValidationError[] } {
  const errors: ValidationError[] = []
  const phaseMap = new Map<string, {
    percentageOfTotal: number
    color: string | null
    stageMap: Map<string, ParsedActivity[]>
  }>()
  const phaseOrder: string[] = []

  const allActivityNames: string[] = []

  for (let i = 0; i < rows.length; i++) {
    const [fase, percentual, cor, etapa, atividade, peso, duracao, deps] = rows[i]

    const faseName = String(fase ?? '').trim()
    const etapaName = String(etapa ?? '').trim()
    const atividadeName = String(atividade ?? '').trim()

    if (!faseName || !etapaName || !atividadeName) continue

    allActivityNames.push(atividadeName)

    if (!phaseMap.has(faseName)) {
      phaseMap.set(faseName, {
        percentageOfTotal: Number(percentual) || 0,
        color: cor ? String(cor).trim() : null,
        stageMap: new Map(),
      })
      phaseOrder.push(faseName)
    }

    const phase = phaseMap.get(faseName)!
    if (!phase.stageMap.has(etapaName)) {
      phase.stageMap.set(etapaName, [])
    }

    const activities = phase.stageMap.get(etapaName)!
    const depsStr = String(deps ?? '').trim()
    const depsList = depsStr
      ? depsStr.split(';').map((d) => d.trim()).filter((d) => d.length > 0)
      : null

    activities.push({
      name: atividadeName,
      order: activities.length,
      weight: Number(peso) || 1,
      durationDays: duracao && !isNaN(Number(duracao)) ? Number(duracao) : null,
      dependencies: depsList,
    })
  }

  // Validate or auto-calculate percentage
  if (autoCalcPercentage) {
    let totalWeight = 0
    for (const p of phaseMap.values()) {
      for (const acts of p.stageMap.values()) {
        totalWeight += acts.reduce((s, a) => s + a.weight, 0)
      }
    }

    if (totalWeight > 0) {
      for (const p of phaseMap.values()) {
        let phaseWeight = 0
        for (const acts of p.stageMap.values()) {
          phaseWeight += acts.reduce((s, a) => s + a.weight, 0)
        }
        p.percentageOfTotal = Math.round((phaseWeight / totalWeight) * 10000) / 100
      }

      // Adjust rounding so sum = exactly 100
      const values = Array.from(phaseMap.values())
      const sum = values.reduce((s, p) => s + p.percentageOfTotal, 0)
      if (values.length > 0 && Math.abs(sum - 100) > 0.001) {
        values[values.length - 1].percentageOfTotal += Math.round((100 - sum) * 100) / 100
      }
    }
  } else {
    const percentSum = Array.from(phaseMap.values()).reduce((s, p) => s + p.percentageOfTotal, 0)
    if (Math.abs(percentSum - 100) >= 0.1) {
      errors.push({
        row: 0,
        message: `Soma dos percentuais das fases é ${percentSum.toFixed(1)}%, deveria ser 100%`,
      })
    }
  }

  // Validate dependencies reference existing activities
  for (let i = 0; i < rows.length; i++) {
    const depsStr = String(rows[i][7] ?? '').trim()
    if (!depsStr) continue
    const depsList = depsStr.split(';').map((d) => d.trim()).filter((d) => d.length > 0)
    for (const dep of depsList) {
      if (!allActivityNames.includes(dep)) {
        errors.push({ row: i + 2, message: `Dependência "${dep}" não encontrada na planilha` })
      }
    }
  }

  // Build phases array
  const phases: ParsedPhase[] = phaseOrder.map((phaseName, pIdx) => {
    const p = phaseMap.get(phaseName)!
    const stageNames = Array.from(p.stageMap.keys())
    return {
      name: phaseName,
      order: pIdx,
      percentageOfTotal: p.percentageOfTotal,
      color: p.color,
      stages: stageNames.map((sName, sIdx) => ({
        name: sName,
        order: sIdx,
        activities: p.stageMap.get(sName)!,
      })),
    }
  })

  return { phases, errors }
}

/** Inject sinapiMap data into parsed phases by matching activity names */
export function injectSinapiMap(phases: ParsedPhase[], sinapiMap?: Record<string, SinapiMapping>) {
  if (!sinapiMap) return
  for (const phase of phases) {
    for (const stage of phase.stages) {
      for (const act of stage.activities) {
        const mapping = sinapiMap[act.name]
        if (mapping) {
          act.sinapiCodigo = mapping.sinapiCodigo
          act.areaTipo = mapping.areaTipo
          act.tags = mapping.tags || []
          act.padrao = mapping.padrao ?? true
        }
      }
    }
  }
}
