/**
 * Seed de mapeamentos padrão Etapa→SINAPI (tenantId=null = sistema).
 * Executar: npx tsx prisma/seed-mappings.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface MappingSeed {
  fase: string
  etapa: string
  atividade: string
  grupoSinapi: string
  sinapiCodigo?: string
  unidade?: string
}

const MAPPINGS: MappingSeed[] = [
  // ====== FUNDAÇÃO ======
  { fase: 'Fundação', etapa: 'Terraplanagem', atividade: 'Escavação mecanizada de solo', grupoSinapi: 'Escavação de Valas', unidade: 'm³' },
  { fase: 'Fundação', etapa: 'Terraplanagem', atividade: 'Aterro compactado', grupoSinapi: 'Aterro e Reaterro de Valas', unidade: 'm³' },
  { fase: 'Fundação', etapa: 'Terraplanagem', atividade: 'Carga e transporte de solo', grupoSinapi: 'Carga e Descarga de Solo', unidade: 'm³' },
  { fase: 'Fundação', etapa: 'Fundação', atividade: 'Sapata de concreto armado', grupoSinapi: 'Fundações Rasas', unidade: 'm³' },
  { fase: 'Fundação', etapa: 'Fundação', atividade: 'Estaca de concreto', grupoSinapi: 'Fundações Profundas', unidade: 'm' },
  { fase: 'Fundação', etapa: 'Fundação', atividade: 'Viga baldrame', grupoSinapi: 'Fundações Rasas', unidade: 'm³' },
  { fase: 'Fundação', etapa: 'Impermeabilização', atividade: 'Impermeabilização de fundação', grupoSinapi: 'Impermeabilizações', unidade: 'm²' },

  // ====== ESTRUTURA ======
  { fase: 'Estrutura', etapa: 'Forma', atividade: 'Forma de madeira para pilares', grupoSinapi: 'Formas', unidade: 'm²' },
  { fase: 'Estrutura', etapa: 'Forma', atividade: 'Forma de madeira para vigas', grupoSinapi: 'Formas', unidade: 'm²' },
  { fase: 'Estrutura', etapa: 'Forma', atividade: 'Forma de madeira para lajes', grupoSinapi: 'Formas', unidade: 'm²' },
  { fase: 'Estrutura', etapa: 'Armação', atividade: 'Armação de aço CA-50', grupoSinapi: 'Armações', unidade: 'kg' },
  { fase: 'Estrutura', etapa: 'Armação', atividade: 'Armação de aço CA-60', grupoSinapi: 'Armações', unidade: 'kg' },
  { fase: 'Estrutura', etapa: 'Concreto', atividade: 'Concretagem de pilares', grupoSinapi: 'Concretos', unidade: 'm³' },
  { fase: 'Estrutura', etapa: 'Concreto', atividade: 'Concretagem de vigas', grupoSinapi: 'Concretos', unidade: 'm³' },
  { fase: 'Estrutura', etapa: 'Concreto', atividade: 'Concretagem de lajes', grupoSinapi: 'Concretos', unidade: 'm³' },
  { fase: 'Estrutura', etapa: 'Laje', atividade: 'Laje pré-moldada', grupoSinapi: 'Lajes Pré-Moldadas/Treliçadas', unidade: 'm²' },

  // ====== ALVENARIA ======
  { fase: 'Alvenaria', etapa: 'Alvenaria', atividade: 'Alvenaria de vedação em bloco cerâmico', grupoSinapi: 'Alvenaria de Vedação', unidade: 'm²' },
  { fase: 'Alvenaria', etapa: 'Alvenaria', atividade: 'Alvenaria de vedação em bloco de concreto', grupoSinapi: 'Alvenaria de Vedação', unidade: 'm²' },
  { fase: 'Alvenaria', etapa: 'Alvenaria', atividade: 'Verga e contraverga', grupoSinapi: 'Vergas e Contravergas', unidade: 'm' },
  { fase: 'Alvenaria', etapa: 'Alvenaria', atividade: 'Encunhamento', grupoSinapi: 'Alvenaria de Vedação', unidade: 'm' },

  // ====== INSTALAÇÕES HIDRÁULICAS ======
  { fase: 'Instalações', etapa: 'Hidráulica', atividade: 'Tubulação de água fria PVC', grupoSinapi: 'Instalações Hidráulicas - Água Fria', unidade: 'm' },
  { fase: 'Instalações', etapa: 'Hidráulica', atividade: 'Tubulação de esgoto PVC', grupoSinapi: 'Instalações Hidráulicas - Esgoto', unidade: 'm' },
  { fase: 'Instalações', etapa: 'Hidráulica', atividade: 'Louças e metais', grupoSinapi: 'Louças e Metais', unidade: 'un' },

  // ====== INSTALAÇÕES ELÉTRICAS ======
  { fase: 'Instalações', etapa: 'Elétrica', atividade: 'Eletroduto PVC', grupoSinapi: 'Instalações Elétricas - Eletrodutos', unidade: 'm' },
  { fase: 'Instalações', etapa: 'Elétrica', atividade: 'Fiação elétrica', grupoSinapi: 'Instalações Elétricas - Fios e Cabos', unidade: 'm' },
  { fase: 'Instalações', etapa: 'Elétrica', atividade: 'Quadro de distribuição', grupoSinapi: 'Instalações Elétricas - Quadros', unidade: 'un' },
  { fase: 'Instalações', etapa: 'Elétrica', atividade: 'Tomadas e interruptores', grupoSinapi: 'Instalações Elétricas - Interruptores e Tomadas', unidade: 'un' },

  // ====== REVESTIMENTO ======
  { fase: 'Revestimento', etapa: 'Chapisco', atividade: 'Chapisco de aderência', grupoSinapi: 'Chapisco', unidade: 'm²' },
  { fase: 'Revestimento', etapa: 'Reboco', atividade: 'Reboco interno', grupoSinapi: 'Reboco/Emboço', unidade: 'm²' },
  { fase: 'Revestimento', etapa: 'Reboco', atividade: 'Reboco externo', grupoSinapi: 'Reboco/Emboço', unidade: 'm²' },
  { fase: 'Revestimento', etapa: 'Contrapiso', atividade: 'Contrapiso de argamassa', grupoSinapi: 'Contrapiso', unidade: 'm²' },
  { fase: 'Revestimento', etapa: 'Cerâmica', atividade: 'Revestimento cerâmico de piso', grupoSinapi: 'Pisos Cerâmicos', unidade: 'm²' },
  { fase: 'Revestimento', etapa: 'Cerâmica', atividade: 'Revestimento cerâmico de parede', grupoSinapi: 'Revestimentos Cerâmicos de Parede', unidade: 'm²' },

  // ====== PINTURA ======
  { fase: 'Pintura', etapa: 'Pintura Interna', atividade: 'Massa corrida PVA', grupoSinapi: 'Pintura Interna', unidade: 'm²' },
  { fase: 'Pintura', etapa: 'Pintura Interna', atividade: 'Pintura látex PVA interna', grupoSinapi: 'Pintura Interna', unidade: 'm²' },
  { fase: 'Pintura', etapa: 'Pintura Externa', atividade: 'Textura acrílica externa', grupoSinapi: 'Pintura Externa', unidade: 'm²' },
  { fase: 'Pintura', etapa: 'Pintura Externa', atividade: 'Pintura acrílica externa', grupoSinapi: 'Pintura Externa', unidade: 'm²' },

  // ====== COBERTURA ======
  { fase: 'Cobertura', etapa: 'Estrutura', atividade: 'Estrutura de madeira para telhado', grupoSinapi: 'Estrutura para Telhado', unidade: 'm²' },
  { fase: 'Cobertura', etapa: 'Telhamento', atividade: 'Telha cerâmica', grupoSinapi: 'Telhamento', unidade: 'm²' },
  { fase: 'Cobertura', etapa: 'Telhamento', atividade: 'Telha de fibrocimento', grupoSinapi: 'Telhamento', unidade: 'm²' },
  { fase: 'Cobertura', etapa: 'Calha', atividade: 'Calha e rufos', grupoSinapi: 'Calhas e Rufos', unidade: 'm' },

  // ====== ESQUADRIAS ======
  { fase: 'Esquadrias', etapa: 'Portas', atividade: 'Porta de madeira interna', grupoSinapi: 'Portas', unidade: 'un' },
  { fase: 'Esquadrias', etapa: 'Portas', atividade: 'Porta de alumínio', grupoSinapi: 'Portas', unidade: 'un' },
  { fase: 'Esquadrias', etapa: 'Janelas', atividade: 'Janela de alumínio', grupoSinapi: 'Janelas', unidade: 'un' },
  { fase: 'Esquadrias', etapa: 'Vidros', atividade: 'Vidro temperado', grupoSinapi: 'Vidros', unidade: 'm²' },

  // ====== ACABAMENTO ======
  { fase: 'Acabamento', etapa: 'Soleira e Peitoril', atividade: 'Soleira de granito', grupoSinapi: 'Soleiras e Peitoris', unidade: 'm' },
  { fase: 'Acabamento', etapa: 'Soleira e Peitoril', atividade: 'Peitoril de granito', grupoSinapi: 'Soleiras e Peitoris', unidade: 'm' },
  { fase: 'Acabamento', etapa: 'Rodapé', atividade: 'Rodapé cerâmico', grupoSinapi: 'Rodapés', unidade: 'm' },

  // ====== INFRAESTRUTURA EXTERNA ======
  { fase: 'Infraestrutura Externa', etapa: 'Pavimentação', atividade: 'Piso intertravado', grupoSinapi: 'Pavimentação', unidade: 'm²' },
  { fase: 'Infraestrutura Externa', etapa: 'Drenagem', atividade: 'Drenagem pluvial', grupoSinapi: 'Drenagem', unidade: 'm' },
  { fase: 'Infraestrutura Externa', etapa: 'Muro', atividade: 'Muro de divisa', grupoSinapi: 'Muros e Arrimos', unidade: 'm²' },

  // ====== LIMPEZA ======
  { fase: 'Limpeza', etapa: 'Limpeza Final', atividade: 'Limpeza final da obra', grupoSinapi: 'Limpeza de Obra', unidade: 'm²' },
]

async function main() {
  console.log('Iniciando seed de mapeamentos Etapa→SINAPI...')

  // Remove existing system mappings
  const deleted = await prisma.etapaSinapiMapping.deleteMany({
    where: { tenantId: null },
  })
  console.log(`Removidos ${deleted.count} mapeamentos de sistema existentes`)

  // Create new system mappings
  const data = MAPPINGS.map((m, i) => ({
    tenantId: null as string | null,
    fase: m.fase,
    etapa: m.etapa,
    atividade: m.atividade,
    sinapiCodigo: m.sinapiCodigo || null,
    unidade: m.unidade || null,
    grupoSinapi: m.grupoSinapi,
    order: i,
  }))

  const result = await prisma.etapaSinapiMapping.createMany({ data })
  console.log(`Criados ${result.count} mapeamentos de sistema`)
  console.log('Seed finalizado!')
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
