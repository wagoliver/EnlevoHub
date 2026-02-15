/**
 * Catálogo de serviços sugeridos por tipo de ambiente.
 *
 * Cada serviço sabe:
 *  - qual área calculada usar como quantidade (PISO, PAREDE_LIQ, TETO, PERIMETRO)
 *  - em quais tipos de ambiente ele é sugerido (ALL = todos)
 */

export type AreaTipo = 'PISO' | 'PAREDE_LIQ' | 'PAREDE_BRUTA' | 'TETO' | 'PERIMETRO' | 'MANUAL'

export interface ServicoSugerido {
  id: string
  nome: string
  unidade: string
  areaTipo: AreaTipo
  /** Tag slugs (AREA_MOLHADA, etc.). Vazio = todos os ambientes. */
  tags: string[]
  /** Checked by default */
  padrao: boolean
  /** Grouping label */
  etapa: string
  sinapiCodigo?: string | null
  nomeCustom?: string | null
  sinapiDescricao?: string | null
}

/**
 * Filtra templates que se aplicam ao ambiente com base na interseção de tags.
 * Template com tags=[] aplica a TODOS os ambientes.
 * Template com tags=['AREA_MOLHADA'] aplica apenas se o ambiente tiver a tag AREA_MOLHADA.
 */
export function templateAplicaAoAmbiente(templateTags: string[], ambienteTags: string[]): boolean {
  if (templateTags.length === 0) return true
  return templateTags.some((tag) => ambienteTags.includes(tag))
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
    case 'PAREDE_BRUTA': return areas.areaParedeBruta
    case 'TETO': return areas.areaTeto
    case 'PERIMETRO': return areas.perimetro
    case 'MANUAL': return 0
    default: return 0
  }
}

export const AREA_LABELS: Record<AreaTipo, string> = {
  PISO: 'piso',
  PAREDE_LIQ: 'parede líq.',
  PAREDE_BRUTA: 'parede bruta',
  TETO: 'teto',
  PERIMETRO: 'perímetro',
  MANUAL: 'manual',
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
