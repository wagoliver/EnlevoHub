/**
 * Catálogo de serviços sugeridos por tipo de ambiente.
 *
 * Cada serviço sabe:
 *  - qual área calculada usar como quantidade (PISO, PAREDE_LIQ, TETO, PERIMETRO)
 *  - em quais tipos de ambiente ele é sugerido (ALL = todos)
 */

export type AreaTipo = 'PISO' | 'PAREDE_LIQ' | 'TETO' | 'PERIMETRO'

export interface ServicoSugerido {
  id: string
  nome: string
  unidade: string
  areaTipo: AreaTipo
  /** Tipos de ambiente onde esse serviço é sugerido. Vazio = todos. */
  aplicaEm: string[]
  /** Checked by default */
  padrao: boolean
  /** Grouping label */
  etapa: string
}

export const SERVICOS_CATALOGO: ServicoSugerido[] = [
  // --- Estrutura / Alvenaria ---
  {
    id: 'alvenaria',
    nome: 'Alvenaria (paredes)',
    unidade: 'm²',
    areaTipo: 'PAREDE_LIQ',
    aplicaEm: [],
    padrao: true,
    etapa: 'Alvenaria',
  },
  // --- Revestimento ---
  {
    id: 'chapisco',
    nome: 'Chapisco',
    unidade: 'm²',
    areaTipo: 'PAREDE_LIQ',
    aplicaEm: [],
    padrao: true,
    etapa: 'Revestimento',
  },
  {
    id: 'reboco',
    nome: 'Reboco / Emboço interno',
    unidade: 'm²',
    areaTipo: 'PAREDE_LIQ',
    aplicaEm: [],
    padrao: true,
    etapa: 'Revestimento',
  },
  {
    id: 'azulejo',
    nome: 'Revestimento cerâmico (azulejo)',
    unidade: 'm²',
    areaTipo: 'PAREDE_LIQ',
    aplicaEm: ['BANHEIRO', 'COZINHA', 'AREA_SERVICO'],
    padrao: true,
    etapa: 'Revestimento',
  },
  // --- Pintura ---
  {
    id: 'pintura_parede',
    nome: 'Pintura interna (paredes)',
    unidade: 'm²',
    areaTipo: 'PAREDE_LIQ',
    aplicaEm: [],
    padrao: true,
    etapa: 'Pintura',
  },
  {
    id: 'pintura_teto',
    nome: 'Pintura de teto',
    unidade: 'm²',
    areaTipo: 'TETO',
    aplicaEm: [],
    padrao: true,
    etapa: 'Pintura',
  },
  // --- Piso ---
  {
    id: 'contrapiso',
    nome: 'Contrapiso',
    unidade: 'm²',
    areaTipo: 'PISO',
    aplicaEm: [],
    padrao: true,
    etapa: 'Piso',
  },
  {
    id: 'piso_ceramico',
    nome: 'Piso cerâmico / porcelanato',
    unidade: 'm²',
    areaTipo: 'PISO',
    aplicaEm: [],
    padrao: true,
    etapa: 'Piso',
  },
  {
    id: 'rodape',
    nome: 'Rodapé',
    unidade: 'm',
    areaTipo: 'PERIMETRO',
    aplicaEm: [],
    padrao: true,
    etapa: 'Piso',
  },
  // --- Teto ---
  {
    id: 'forro_gesso',
    nome: 'Forro de gesso',
    unidade: 'm²',
    areaTipo: 'TETO',
    aplicaEm: [],
    padrao: false,
    etapa: 'Teto',
  },
  // --- Impermeabilização ---
  {
    id: 'impermeabilizacao',
    nome: 'Impermeabilização',
    unidade: 'm²',
    areaTipo: 'PISO',
    aplicaEm: ['BANHEIRO', 'AREA_SERVICO', 'VARANDA'],
    padrao: true,
    etapa: 'Impermeabilização',
  },
  // --- Instalações ---
  {
    id: 'inst_eletrica',
    nome: 'Instalação elétrica (pontos)',
    unidade: 'un',
    areaTipo: 'PISO',
    aplicaEm: [],
    padrao: false,
    etapa: 'Instalações',
  },
  {
    id: 'inst_hidraulica',
    nome: 'Instalação hidráulica (pontos)',
    unidade: 'un',
    areaTipo: 'PISO',
    aplicaEm: ['BANHEIRO', 'COZINHA', 'AREA_SERVICO'],
    padrao: false,
    etapa: 'Instalações',
  },
]

/**
 * Retorna os serviços sugeridos para um tipo de ambiente.
 */
export function getServicosPorTipo(ambienteTipo: string): ServicoSugerido[] {
  return SERVICOS_CATALOGO.filter(
    (s) => s.aplicaEm.length === 0 || s.aplicaEm.includes(ambienteTipo),
  )
}

/**
 * Calcula as áreas a partir das dimensões do ambiente.
 */
export function calcularAreas(ambiente: {
  comprimento: number | string
  largura: number | string
  peDireito: number | string
  qtdPortas: number
  qtdJanelas: number
}) {
  const comp = Number(ambiente.comprimento)
  const larg = Number(ambiente.largura)
  const pe = Number(ambiente.peDireito)
  const portas = ambiente.qtdPortas ?? 0
  const janelas = ambiente.qtdJanelas ?? 0

  const areaPiso = comp * larg
  const perimetro = 2 * (comp + larg)
  const areaParedeBruta = perimetro * pe
  const areaPortas = portas * 1.60 * 2.10
  const areaJanelas = janelas * 1.20 * 1.20
  const areaParedeLiquida = Math.max(0, areaParedeBruta - areaPortas - areaJanelas)
  const areaTeto = areaPiso

  return { areaPiso, perimetro, areaParedeBruta, areaParedeLiquida, areaTeto }
}

/**
 * Resolve a quantidade para um serviço baseado no tipo de área.
 */
export function getQuantidadePorArea(
  areaTipo: AreaTipo,
  areas: ReturnType<typeof calcularAreas>,
): number {
  switch (areaTipo) {
    case 'PISO': return areas.areaPiso
    case 'PAREDE_LIQ': return areas.areaParedeLiquida
    case 'TETO': return areas.areaTeto
    case 'PERIMETRO': return areas.perimetro
    default: return 0
  }
}

export const AREA_LABELS: Record<AreaTipo, string> = {
  PISO: 'piso',
  PAREDE_LIQ: 'parede líq.',
  TETO: 'teto',
  PERIMETRO: 'perímetro',
}

/** Lista única de etapas extraídas do catálogo, na ordem natural de obra. */
export const ETAPAS_LISTA = [
  'Alvenaria',
  'Revestimento',
  'Impermeabilização',
  'Piso',
  'Teto',
  'Pintura',
  'Instalações',
  'Esquadrias',
  'Cobertura',
  'Limpeza',
  'Outros',
] as const

export type Etapa = (typeof ETAPAS_LISTA)[number]
