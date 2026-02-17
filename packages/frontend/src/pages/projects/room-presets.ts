// ---------------------------------------------------------------------------
// Room presets by template type
// ---------------------------------------------------------------------------
// Each preset defines a room type with label, default tags, and whether it's
// a wet area (área molhada). Measurements are intentionally left blank —
// the user must fill them in based on the actual floor plan.
// ---------------------------------------------------------------------------

export interface RoomPreset {
  key: string
  label: string
  /** Tags automatically applied (e.g. AREA_MOLHADA) */
  tags: string[]
}

// ── Residential presets (casas, sobrados, condomínios) ────────────────────────

const RESIDENTIAL: RoomPreset[] = [
  { key: 'sala', label: 'Sala', tags: [] },
  { key: 'sala-jantar', label: 'Sala de Jantar', tags: [] },
  { key: 'sala-tv', label: 'Sala de TV', tags: [] },
  { key: 'quarto', label: 'Quarto', tags: [] },
  { key: 'suite', label: 'Suíte', tags: [] },
  { key: 'closet', label: 'Closet', tags: [] },
  { key: 'banheiro', label: 'Banheiro', tags: ['AREA_MOLHADA'] },
  { key: 'lavabo', label: 'Lavabo', tags: ['AREA_MOLHADA'] },
  { key: 'cozinha', label: 'Cozinha', tags: ['AREA_MOLHADA'] },
  { key: 'copa', label: 'Copa', tags: ['AREA_MOLHADA'] },
  { key: 'lavanderia', label: 'Lavanderia', tags: ['AREA_MOLHADA'] },
  { key: 'area-servico', label: 'Área de Serviço', tags: ['AREA_MOLHADA'] },
  { key: 'area-gourmet', label: 'Área Gourmet / Churrasqueira', tags: ['AREA_EXTERNA'] },
  { key: 'varanda', label: 'Varanda / Sacada', tags: ['AREA_EXTERNA'] },
  { key: 'terraço', label: 'Terraço', tags: ['AREA_EXTERNA'] },
  { key: 'garagem', label: 'Garagem', tags: [] },
  { key: 'hall', label: 'Hall / Corredor', tags: [] },
  { key: 'escada', label: 'Escada', tags: [] },
  { key: 'despensa', label: 'Despensa', tags: [] },
  { key: 'escritorio', label: 'Escritório', tags: [] },
  { key: 'deposito', label: 'Depósito', tags: [] },
  { key: 'jardim', label: 'Jardim', tags: ['AREA_EXTERNA'] },
  { key: 'piscina', label: 'Piscina', tags: ['AREA_MOLHADA', 'AREA_EXTERNA'] },
  { key: 'casa-maquinas', label: 'Casa de Máquinas', tags: [] },
  { key: 'cisterna', label: 'Cisterna', tags: ['AREA_MOLHADA'] },
  { key: 'subsolo', label: 'Subsolo / Porão', tags: [] },
  { key: 'sotao', label: 'Sótão', tags: [] },
]

// ── Apartment-specific ───────────────────────────────────────────────────────

const APARTMENT: RoomPreset[] = [
  { key: 'sala', label: 'Sala', tags: [] },
  { key: 'sala-jantar', label: 'Sala de Jantar', tags: [] },
  { key: 'sala-tv', label: 'Sala de TV', tags: [] },
  { key: 'quarto', label: 'Quarto', tags: [] },
  { key: 'suite', label: 'Suíte', tags: [] },
  { key: 'closet', label: 'Closet', tags: [] },
  { key: 'banheiro', label: 'Banheiro', tags: ['AREA_MOLHADA'] },
  { key: 'lavabo', label: 'Lavabo', tags: ['AREA_MOLHADA'] },
  { key: 'cozinha', label: 'Cozinha', tags: ['AREA_MOLHADA'] },
  { key: 'copa', label: 'Copa', tags: ['AREA_MOLHADA'] },
  { key: 'lavanderia', label: 'Lavanderia', tags: ['AREA_MOLHADA'] },
  { key: 'area-servico', label: 'Área de Serviço', tags: ['AREA_MOLHADA'] },
  { key: 'varanda', label: 'Varanda / Sacada', tags: [] },
  { key: 'terraço', label: 'Terraço', tags: [] },
  { key: 'hall', label: 'Hall / Corredor', tags: [] },
  { key: 'despensa', label: 'Despensa', tags: [] },
  { key: 'escritorio', label: 'Escritório', tags: [] },
  { key: 'deposito', label: 'Depósito', tags: [] },
]

// ── Commercial (loja, sala comercial, reforma comercial) ────────────────────

const COMMERCIAL: RoomPreset[] = [
  { key: 'salao', label: 'Salão', tags: [] },
  { key: 'escritorio', label: 'Escritório', tags: [] },
  { key: 'recepcao', label: 'Recepção', tags: [] },
  { key: 'sala-reuniao', label: 'Sala de Reunião', tags: [] },
  { key: 'sala-treinamento', label: 'Sala de Treinamento', tags: [] },
  { key: 'banheiro', label: 'Banheiro', tags: ['AREA_MOLHADA'] },
  { key: 'copa', label: 'Copa', tags: ['AREA_MOLHADA'] },
  { key: 'cozinha', label: 'Cozinha', tags: ['AREA_MOLHADA'] },
  { key: 'deposito', label: 'Depósito', tags: [] },
  { key: 'almoxarifado', label: 'Almoxarifado', tags: [] },
  { key: 'arquivo', label: 'Arquivo', tags: [] },
  { key: 'hall', label: 'Hall / Corredor', tags: [] },
  { key: 'vitrine', label: 'Vitrine / Fachada', tags: [] },
  { key: 'estacionamento', label: 'Estacionamento', tags: [] },
  { key: 'casa-maquinas', label: 'Casa de Máquinas', tags: [] },
]

// ── Industrial (galpão, barracão) ───────────────────────────────────────────

const INDUSTRIAL: RoomPreset[] = [
  { key: 'galpao', label: 'Galpão', tags: [] },
  { key: 'escritorio', label: 'Escritório', tags: [] },
  { key: 'recepcao', label: 'Recepção', tags: [] },
  { key: 'vestiario', label: 'Vestiário', tags: ['AREA_MOLHADA'] },
  { key: 'banheiro', label: 'Banheiro', tags: ['AREA_MOLHADA'] },
  { key: 'refeitorio', label: 'Refeitório', tags: ['AREA_MOLHADA'] },
  { key: 'cozinha-industrial', label: 'Cozinha Industrial', tags: ['AREA_MOLHADA'] },
  { key: 'deposito', label: 'Depósito', tags: [] },
  { key: 'almoxarifado', label: 'Almoxarifado', tags: [] },
  { key: 'sala-reuniao', label: 'Sala de Reunião', tags: [] },
  { key: 'area-carga', label: 'Área de Carga', tags: [] },
  { key: 'guarita', label: 'Guarita', tags: [] },
  { key: 'casa-maquinas', label: 'Casa de Máquinas', tags: [] },
  { key: 'estacionamento', label: 'Estacionamento', tags: [] },
]

// ── Reform — reuses residential but adds external areas ─────────────────────

const REFORM_INTERNAL: RoomPreset[] = [
  ...RESIDENTIAL,
]

const REFORM_EXTERNAL: RoomPreset[] = [
  { key: 'fachada', label: 'Fachada', tags: ['AREA_EXTERNA'] },
  { key: 'area-externa', label: 'Área Externa', tags: ['AREA_EXTERNA'] },
  { key: 'calcada', label: 'Calçada', tags: ['AREA_EXTERNA'] },
  { key: 'muro', label: 'Muro', tags: ['AREA_EXTERNA'] },
  { key: 'telhado', label: 'Telhado', tags: ['AREA_EXTERNA'] },
  { key: 'garagem', label: 'Garagem', tags: [] },
  { key: 'jardim', label: 'Jardim', tags: ['AREA_EXTERNA'] },
  { key: 'piscina', label: 'Piscina', tags: ['AREA_MOLHADA', 'AREA_EXTERNA'] },
  { key: 'area-gourmet', label: 'Área Gourmet / Churrasqueira', tags: ['AREA_EXTERNA'] },
  { key: 'cisterna', label: 'Cisterna', tags: ['AREA_MOLHADA'] },
  { key: 'casa-maquinas', label: 'Casa de Máquinas', tags: [] },
]

// ── Specialized installations ───────────────────────────────────────────────

const INSTALLATIONS: RoomPreset[] = [
  { key: 'area-tecnica', label: 'Área Técnica', tags: [] },
  { key: 'casa-maquinas', label: 'Casa de Máquinas', tags: [] },
  { key: 'telhado', label: 'Telhado', tags: ['AREA_EXTERNA'] },
  { key: 'sala', label: 'Sala', tags: [] },
  { key: 'quarto', label: 'Quarto', tags: [] },
  { key: 'banheiro', label: 'Banheiro', tags: ['AREA_MOLHADA'] },
  { key: 'cozinha', label: 'Cozinha', tags: ['AREA_MOLHADA'] },
  { key: 'lavanderia', label: 'Lavanderia', tags: ['AREA_MOLHADA'] },
  { key: 'area-externa', label: 'Área Externa', tags: ['AREA_EXTERNA'] },
  { key: 'subsolo', label: 'Subsolo / Porão', tags: [] },
  { key: 'cisterna', label: 'Cisterna', tags: ['AREA_MOLHADA'] },
]

// ── Finishing / services (pintura, piso, etc.) ──────────────────────────────

const FINISHING: RoomPreset[] = [
  ...RESIDENTIAL,
]

// ── Generic fallback ────────────────────────────────────────────────────────

const GENERIC: RoomPreset[] = [
  { key: 'sala', label: 'Sala', tags: [] },
  { key: 'quarto', label: 'Quarto', tags: [] },
  { key: 'suite', label: 'Suíte', tags: [] },
  { key: 'banheiro', label: 'Banheiro', tags: ['AREA_MOLHADA'] },
  { key: 'lavabo', label: 'Lavabo', tags: ['AREA_MOLHADA'] },
  { key: 'cozinha', label: 'Cozinha', tags: ['AREA_MOLHADA'] },
  { key: 'copa', label: 'Copa', tags: ['AREA_MOLHADA'] },
  { key: 'lavanderia', label: 'Lavanderia', tags: ['AREA_MOLHADA'] },
  { key: 'area-servico', label: 'Área de Serviço', tags: ['AREA_MOLHADA'] },
  { key: 'closet', label: 'Closet', tags: [] },
  { key: 'varanda', label: 'Varanda / Sacada', tags: ['AREA_EXTERNA'] },
  { key: 'garagem', label: 'Garagem', tags: [] },
  { key: 'hall', label: 'Hall / Corredor', tags: [] },
  { key: 'escritorio', label: 'Escritório', tags: [] },
  { key: 'despensa', label: 'Despensa', tags: [] },
  { key: 'deposito', label: 'Depósito', tags: [] },
  { key: 'area-gourmet', label: 'Área Gourmet / Churrasqueira', tags: ['AREA_EXTERNA'] },
  { key: 'area-externa', label: 'Área Externa', tags: ['AREA_EXTERNA'] },
  { key: 'jardim', label: 'Jardim', tags: ['AREA_EXTERNA'] },
]

// ---------------------------------------------------------------------------
// Template key → room presets mapping
// ---------------------------------------------------------------------------

const TEMPLATE_PRESETS: Record<string, RoomPreset[]> = {
  // Construção Nova — Residencial
  'casa-terrea': RESIDENTIAL,
  'sobrado': RESIDENTIAL,
  'condominio-casas': RESIDENTIAL,
  // Construção Nova — Apartamentos
  'apartamento-edificio': APARTMENT,
  'condominio-apartamentos': APARTMENT,
  // Construção Nova — Comercial / Industrial
  'galpao-barracao': INDUSTRIAL,
  'loja-sala-comercial': COMMERCIAL,
  // Reforma
  'reforma-interna': REFORM_INTERNAL,
  'reforma-externa': REFORM_EXTERNAL,
  'reforma-comercial': COMMERCIAL,
  // Instalações Especializadas
  'eletrica': INSTALLATIONS,
  'hidraulica': INSTALLATIONS,
  'energia-solar': INSTALLATIONS,
  'ar-condicionado': INSTALLATIONS,
  // Acabamento e Serviços
  'pintura': FINISHING,
  'paisagismo': REFORM_EXTERNAL,
  'piscina': REFORM_EXTERNAL,
  'piso-revestimento': FINISHING,
  'telhado-cobertura': REFORM_EXTERNAL,
  'impermeabilizacao': FINISHING,
}

/**
 * Returns room presets for a given template key.
 * Falls back to GENERIC if template key is unknown or not provided.
 */
export function getRoomPresets(templateKey?: string | null): RoomPreset[] {
  if (!templateKey) return GENERIC
  return TEMPLATE_PRESETS[templateKey] ?? GENERIC
}

/**
 * Returns room presets based on the floor plan UnitType.
 * Used when the user changes the "Tipo" dropdown in the form.
 */
const TYPE_PRESETS: Record<string, RoomPreset[]> = {
  APARTMENT: APARTMENT,
  HOUSE: RESIDENTIAL,
  COMMERCIAL: COMMERCIAL,
  LAND: GENERIC,
}

export function getPresetsByType(unitType: string): RoomPreset[] {
  return TYPE_PRESETS[unitType] ?? GENERIC
}

// ---------------------------------------------------------------------------
// Categorization for UI grouping
// ---------------------------------------------------------------------------

export interface PresetGroup {
  label: string
  presets: RoomPreset[]
}

const SUPPORT_KEYS = new Set([
  'hall', 'escada', 'despensa', 'deposito', 'closet', 'casa-maquinas',
  'cisterna', 'subsolo', 'sotao', 'area-tecnica', 'almoxarifado',
  'arquivo', 'guarita', 'area-carga', 'estacionamento', 'vitrine',
  'garagem',
])

function classifyPreset(p: RoomPreset): string {
  // Items with ONLY AREA_EXTERNA (no AREA_MOLHADA) go to externa
  if (p.tags.includes('AREA_EXTERNA') && !p.tags.includes('AREA_MOLHADA')) return 'externa'
  // Items with AREA_MOLHADA go to molhada (even if also AREA_EXTERNA, like piscina)
  if (p.tags.includes('AREA_MOLHADA')) return 'molhada'
  if (SUPPORT_KEYS.has(p.key)) return 'apoio'
  return 'principal'
}

/**
 * Groups presets into categorized sections for the dropdown UI.
 * Only returns groups that have at least one preset.
 */
export function groupPresets(presets: RoomPreset[]): PresetGroup[] {
  const buckets: Record<string, RoomPreset[]> = {
    principal: [],
    molhada: [],
    externa: [],
    apoio: [],
  }

  for (const p of presets) {
    buckets[classifyPreset(p)].push(p)
  }

  const labels: Record<string, string> = {
    principal: 'Ambientes Principais',
    molhada: 'Áreas Molhadas',
    externa: 'Externas / Lazer',
    apoio: 'Apoio / Técnicas',
  }

  return ['principal', 'molhada', 'externa', 'apoio']
    .filter(k => buckets[k].length > 0)
    .map(k => ({ label: labels[k], presets: buckets[k] }))
}
