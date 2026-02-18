// ---------------------------------------------------------------------------
// Measurement presets — categorias de medição por tipo de serviço de obra
// ---------------------------------------------------------------------------
// Substitui room-presets para o novo modelo onde o usuário informa medições
// por categoria de serviço (ex: "Piso: 180 m²") em vez de cômodos físicos.
// ---------------------------------------------------------------------------

export interface MeasurementPreset {
  key: string           // "piso", "alvenaria", "cobertura"
  label: string         // "Área de Piso"
  category: string      // "PISO", "ALVENARIA", "COBERTURA"
  measurementType: 'AREA_M2' | 'LINEAR_M' | 'QUANTITY' | 'VOLUME_M3'
  areaTipo?: string     // Mapa para AreaTipo: "PISO", "PAREDE_LIQ", etc.
  unit: string          // "m²", "m", "un", "m³"
}

export interface MeasurementPresetGroup {
  label: string
  presets: MeasurementPreset[]
}

// ---------------------------------------------------------------------------
// Presets por grupo
// ---------------------------------------------------------------------------

const ESTRUTURA: MeasurementPreset[] = [
  { key: 'terreno', label: 'Terreno', category: 'TERRENO', measurementType: 'AREA_M2', areaTipo: 'PISO', unit: 'm²' },
  { key: 'fundacao', label: 'Fundação', category: 'FUNDACAO', measurementType: 'AREA_M2', areaTipo: 'PISO', unit: 'm²' },
  { key: 'estrutura', label: 'Estrutura', category: 'ESTRUTURA', measurementType: 'AREA_M2', areaTipo: 'PISO', unit: 'm²' },
]

const VEDACAO: MeasurementPreset[] = [
  { key: 'alvenaria', label: 'Alvenaria', category: 'ALVENARIA', measurementType: 'AREA_M2', areaTipo: 'PAREDE_BRUTA', unit: 'm²' },
  { key: 'divisorias', label: 'Divisórias', category: 'DIVISORIAS', measurementType: 'AREA_M2', areaTipo: 'PAREDE_LIQ', unit: 'm²' },
]

const REVESTIMENTO: MeasurementPreset[] = [
  { key: 'piso', label: 'Piso', category: 'PISO', measurementType: 'AREA_M2', areaTipo: 'PISO', unit: 'm²' },
  { key: 'parede-revestimento', label: 'Parede Revestimento', category: 'PAREDE_REVESTIMENTO', measurementType: 'AREA_M2', areaTipo: 'PAREDE_LIQ', unit: 'm²' },
  { key: 'teto-forro', label: 'Teto / Forro', category: 'TETO_FORRO', measurementType: 'AREA_M2', areaTipo: 'TETO', unit: 'm²' },
]

const COBERTURA: MeasurementPreset[] = [
  { key: 'cobertura', label: 'Cobertura / Telhado', category: 'COBERTURA', measurementType: 'AREA_M2', areaTipo: 'PISO', unit: 'm²' },
]

const INSTALACOES: MeasurementPreset[] = [
  { key: 'tubulacao-hidraulica', label: 'Tubulação Hidráulica', category: 'TUBULACAO_HIDRAULICA', measurementType: 'LINEAR_M', areaTipo: 'LINEAR', unit: 'm' },
  { key: 'fiacao-eletrica', label: 'Fiação Elétrica', category: 'FIACAO_ELETRICA', measurementType: 'LINEAR_M', areaTipo: 'LINEAR', unit: 'm' },
]

const ESQUADRIAS: MeasurementPreset[] = [
  { key: 'portas', label: 'Portas', category: 'PORTAS', measurementType: 'QUANTITY', unit: 'un' },
  { key: 'janelas', label: 'Janelas', category: 'JANELAS', measurementType: 'QUANTITY', unit: 'un' },
]

const ACABAMENTO: MeasurementPreset[] = [
  { key: 'pintura-parede', label: 'Pintura Parede', category: 'PINTURA_PAREDE', measurementType: 'AREA_M2', areaTipo: 'PAREDE_LIQ', unit: 'm²' },
  { key: 'pintura-teto', label: 'Pintura Teto', category: 'PINTURA_TETO', measurementType: 'AREA_M2', areaTipo: 'TETO', unit: 'm²' },
  { key: 'impermeabilizacao', label: 'Impermeabilização', category: 'IMPERMEABILIZACAO', measurementType: 'AREA_M2', areaTipo: 'PISO', unit: 'm²' },
]

const PERIMETRO: MeasurementPreset[] = [
  { key: 'perimetro-total', label: 'Perímetro Total', category: 'PERIMETRO_TOTAL', measurementType: 'LINEAR_M', areaTipo: 'PERIMETRO', unit: 'm' },
  { key: 'muro-cerca', label: 'Muro / Cerca', category: 'MURO_CERCA', measurementType: 'LINEAR_M', areaTipo: 'LINEAR', unit: 'm' },
]

// ---------------------------------------------------------------------------
// All presets grouped
// ---------------------------------------------------------------------------

export const MEASUREMENT_PRESET_GROUPS: MeasurementPresetGroup[] = [
  { label: 'Estrutura', presets: ESTRUTURA },
  { label: 'Vedação', presets: VEDACAO },
  { label: 'Revestimento', presets: REVESTIMENTO },
  { label: 'Cobertura', presets: COBERTURA },
  { label: 'Instalações', presets: INSTALACOES },
  { label: 'Esquadrias', presets: ESQUADRIAS },
  { label: 'Acabamento', presets: ACABAMENTO },
  { label: 'Perímetro', presets: PERIMETRO },
]

export const ALL_MEASUREMENT_PRESETS: MeasurementPreset[] = MEASUREMENT_PRESET_GROUPS.flatMap(g => g.presets)

/**
 * Returns the unit label for a measurement type.
 */
export function getMeasurementUnit(measurementType: string): string {
  switch (measurementType) {
    case 'AREA_M2': return 'm²'
    case 'LINEAR_M': return 'm'
    case 'QUANTITY': return 'un'
    case 'VOLUME_M3': return 'm³'
    default: return ''
  }
}
