import { useState } from 'react'
import { ChevronRight, ChevronDown, Package, Wrench, Cpu, HardHat } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface TreeNode {
  type: 'composicao' | 'insumo'
  codigo: string
  descricao: string
  unidade: string
  coeficiente: number
  custoUnitario: number
  // insumo-specific
  tipo?: string
  precoUnitario?: number
  temPreco?: boolean
  // composicao-specific
  children?: TreeNode[]
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

function formatCoef(value: number) {
  if (value >= 1) return value.toFixed(4)
  if (value >= 0.01) return value.toFixed(6)
  return value.toExponential(2)
}

const TIPO_CONFIG: Record<string, { label: string; color: string; icon: typeof Package }> = {
  MATERIAL: { label: 'MAT', color: 'bg-blue-100 text-blue-700', icon: Package },
  MAO_DE_OBRA: { label: 'MO', color: 'bg-amber-100 text-amber-700', icon: HardHat },
  EQUIPAMENTO: { label: 'EQP', color: 'bg-purple-100 text-purple-700', icon: Cpu },
  SERVICO: { label: 'SRV', color: 'bg-green-100 text-green-700', icon: Wrench },
}

function InsumoNode({ node, depth }: { node: TreeNode; depth: number }) {
  const config = TIPO_CONFIG[node.tipo || ''] || TIPO_CONFIG.MATERIAL
  const Icon = config.icon

  return (
    <div
      className="flex items-center gap-1.5 py-1 px-2 hover:bg-neutral-50 rounded text-xs"
      style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
    >
      <Icon className="h-3 w-3 shrink-0 text-neutral-400" />
      <Badge className={`text-[9px] px-1 py-0 ${config.color} shrink-0`}>
        {config.label}
      </Badge>
      <span className="font-mono text-neutral-400 shrink-0">{node.codigo}</span>
      <span className="truncate text-neutral-700" title={node.descricao}>
        {node.descricao}
      </span>
      <span className="text-neutral-400 shrink-0 ml-auto">
        {node.unidade}
      </span>
      <span className="font-mono text-neutral-500 shrink-0 w-16 text-right" title="Coeficiente">
        x{formatCoef(node.coeficiente)}
      </span>
      {node.temPreco ? (
        <span className="font-mono text-green-700 shrink-0 w-20 text-right">
          {formatCurrency(node.custoUnitario)}
        </span>
      ) : (
        <span className="font-mono text-amber-500 shrink-0 w-20 text-right text-[10px]">
          sem preco
        </span>
      )}
    </div>
  )
}

function ComposicaoNode({ node, depth, defaultOpen }: { node: TreeNode; depth: number; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? depth === 0)

  return (
    <div>
      <div
        className="flex items-center gap-1.5 py-1.5 px-2 hover:bg-neutral-100 rounded cursor-pointer text-xs font-medium"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => setOpen(!open)}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-500" />
        )}
        <Badge variant="outline" className="text-[9px] px-1 py-0 border-orange-300 text-orange-600 shrink-0">
          COMP
        </Badge>
        <span className="font-mono text-neutral-400 shrink-0">{node.codigo}</span>
        <span className="truncate text-neutral-800" title={node.descricao}>
          {node.descricao}
        </span>
        <span className="text-neutral-400 shrink-0 ml-auto">
          {node.unidade}
        </span>
        {depth > 0 && (
          <span className="font-mono text-neutral-500 shrink-0 w-16 text-right" title="Coeficiente">
            x{formatCoef(node.coeficiente)}
          </span>
        )}
        <span className="font-mono text-green-700 shrink-0 w-20 text-right font-semibold">
          {formatCurrency(node.custoUnitario)}
        </span>
      </div>
      {open && node.children && (
        <div>
          {node.children.map((child, i) =>
            child.type === 'composicao' ? (
              <ComposicaoNode key={`${child.codigo}-${i}`} node={child} depth={depth + 1} />
            ) : (
              <InsumoNode key={`${child.codigo}-${i}`} node={child} depth={depth + 1} />
            ),
          )}
        </div>
      )}
    </div>
  )
}

interface ComposicaoTreeProps {
  data: TreeNode
}

export function ComposicaoTree({ data }: ComposicaoTreeProps) {
  return (
    <div className="border rounded-md bg-white overflow-hidden">
      <ComposicaoNode node={data} depth={0} defaultOpen />
    </div>
  )
}
