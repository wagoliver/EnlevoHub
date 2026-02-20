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
  { fase: 'Fundação', etapa: 'Terraplanagem', atividade: 'Escavação mecanizada de solo', grupoSinapi: 'Escavação de Valas', sinapiCodigo: '90086', unidade: 'm³' },
  { fase: 'Fundação', etapa: 'Terraplanagem', atividade: 'Aterro compactado', grupoSinapi: 'Aterro e Reaterro de Valas', sinapiCodigo: '93380', unidade: 'm³' },
  { fase: 'Fundação', etapa: 'Terraplanagem', atividade: 'Carga e transporte de solo', grupoSinapi: 'Carga e Descarga de Solo', sinapiCodigo: '101263', unidade: 'm³' },
  { fase: 'Fundação', etapa: 'Fundação', atividade: 'Sapata de concreto armado', grupoSinapi: 'Fundações Rasas', sinapiCodigo: '96558', unidade: 'm³' },
  { fase: 'Fundação', etapa: 'Fundação', atividade: 'Estaca de concreto', grupoSinapi: 'Fundações Profundas', sinapiCodigo: '100658', unidade: 'm' },
  { fase: 'Fundação', etapa: 'Fundação', atividade: 'Viga baldrame', grupoSinapi: 'Fundações Rasas', sinapiCodigo: '96542', unidade: 'm²' },
  { fase: 'Fundação', etapa: 'Impermeabilização', atividade: 'Impermeabilização de fundação', grupoSinapi: 'Impermeabilizações', sinapiCodigo: '98556', unidade: 'm²' },

  // ====== ESTRUTURA ======
  { fase: 'Estrutura', etapa: 'Forma', atividade: 'Forma de madeira para pilares', grupoSinapi: 'Formas', sinapiCodigo: '92435', unidade: 'm²' },
  { fase: 'Estrutura', etapa: 'Forma', atividade: 'Forma de madeira para vigas', grupoSinapi: 'Formas', sinapiCodigo: '92469', unidade: 'm²' },
  { fase: 'Estrutura', etapa: 'Forma', atividade: 'Forma de madeira para lajes', grupoSinapi: 'Formas', sinapiCodigo: '92515', unidade: 'm²' },
  { fase: 'Estrutura', etapa: 'Armação', atividade: 'Armação de aço CA-50', grupoSinapi: 'Armações', sinapiCodigo: '92919', unidade: 'kg' },
  { fase: 'Estrutura', etapa: 'Armação', atividade: 'Armação de aço CA-60', grupoSinapi: 'Armações', sinapiCodigo: '92759', unidade: 'kg' },
  { fase: 'Estrutura', etapa: 'Concreto', atividade: 'Concretagem de pilares', grupoSinapi: 'Concretos', sinapiCodigo: '103688', unidade: 'm³' },
  { fase: 'Estrutura', etapa: 'Concreto', atividade: 'Concretagem de vigas', grupoSinapi: 'Concretos', sinapiCodigo: '103682', unidade: 'm³' },
  { fase: 'Estrutura', etapa: 'Concreto', atividade: 'Concretagem de lajes', grupoSinapi: 'Concretos', sinapiCodigo: '99431', unidade: 'm³' },
  { fase: 'Estrutura', etapa: 'Laje', atividade: 'Laje pré-moldada', grupoSinapi: 'Lajes Pré-Moldadas/Treliçadas', sinapiCodigo: '106074', unidade: 'm²' },

  // ====== ALVENARIA ======
  { fase: 'Alvenaria', etapa: 'Alvenaria', atividade: 'Alvenaria de vedação em bloco cerâmico', grupoSinapi: 'Alvenaria de Vedação', sinapiCodigo: '103364', unidade: 'm²' },
  { fase: 'Alvenaria', etapa: 'Alvenaria', atividade: 'Alvenaria de vedação em bloco de concreto', grupoSinapi: 'Alvenaria de Vedação', sinapiCodigo: '101154', unidade: 'm²' },
  { fase: 'Alvenaria', etapa: 'Alvenaria', atividade: 'Verga e contraverga', grupoSinapi: 'Vergas e Contravergas', sinapiCodigo: '105030', unidade: 'm' },
  { fase: 'Alvenaria', etapa: 'Alvenaria', atividade: 'Encunhamento', grupoSinapi: 'Alvenaria de Vedação', sinapiCodigo: '93202', unidade: 'm' },

  // ====== INSTALAÇÕES HIDRÁULICAS ======
  { fase: 'Instalações', etapa: 'Hidráulica', atividade: 'Tubulação de água fria PVC', grupoSinapi: 'Instalações Hidráulicas - Água Fria', unidade: 'm' },
  { fase: 'Instalações', etapa: 'Hidráulica', atividade: 'Tubulação de esgoto PVC', grupoSinapi: 'Instalações Hidráulicas - Esgoto', sinapiCodigo: '90698', unidade: 'm' },
  { fase: 'Instalações', etapa: 'Hidráulica', atividade: 'Louças e metais', grupoSinapi: 'Louças e Metais', sinapiCodigo: '100848', unidade: 'un' },

  // ====== INSTALAÇÕES ELÉTRICAS ======
  { fase: 'Instalações', etapa: 'Elétrica', atividade: 'Eletroduto PVC', grupoSinapi: 'Instalações Elétricas - Eletrodutos', unidade: 'm' },
  { fase: 'Instalações', etapa: 'Elétrica', atividade: 'Ponto elétrico', grupoSinapi: 'Instalações Elétricas - Pontos', sinapiCodigo: '91950', unidade: 'un' },
  { fase: 'Instalações', etapa: 'Elétrica', atividade: 'Quadro de distribuição', grupoSinapi: 'Instalações Elétricas - Quadros', sinapiCodigo: '100563', unidade: 'un' },
  { fase: 'Instalações', etapa: 'Elétrica', atividade: 'Tomadas e interruptores', grupoSinapi: 'Instalações Elétricas - Interruptores e Tomadas', sinapiCodigo: '92023', unidade: 'un' },

  // ====== REVESTIMENTO ======
  { fase: 'Revestimento', etapa: 'Chapisco', atividade: 'Chapisco de aderência', grupoSinapi: 'Chapisco', sinapiCodigo: '87907', unidade: 'm²' },
  { fase: 'Revestimento', etapa: 'Reboco', atividade: 'Reboco interno', grupoSinapi: 'Reboco/Emboço', sinapiCodigo: '104967', unidade: 'm²' },
  { fase: 'Revestimento', etapa: 'Reboco', atividade: 'Reboco externo', grupoSinapi: 'Reboco/Emboço', sinapiCodigo: '104247', unidade: 'm²' },
  { fase: 'Revestimento', etapa: 'Contrapiso', atividade: 'Contrapiso de argamassa', grupoSinapi: 'Contrapiso', sinapiCodigo: '87700', unidade: 'm²' },
  { fase: 'Revestimento', etapa: 'Cerâmica', atividade: 'Revestimento cerâmico de piso', grupoSinapi: 'Pisos Cerâmicos', sinapiCodigo: '87256', unidade: 'm²' },
  { fase: 'Revestimento', etapa: 'Cerâmica', atividade: 'Revestimento cerâmico de parede', grupoSinapi: 'Revestimentos Cerâmicos de Parede', sinapiCodigo: '87271', unidade: 'm²' },

  // ====== PINTURA ======
  { fase: 'Pintura', etapa: 'Pintura Interna', atividade: 'Massa corrida PVA', grupoSinapi: 'Pintura Interna', sinapiCodigo: '88497', unidade: 'm²' },
  { fase: 'Pintura', etapa: 'Pintura Interna', atividade: 'Pintura látex PVA interna', grupoSinapi: 'Pintura Interna', sinapiCodigo: '104641', unidade: 'm²' },
  { fase: 'Pintura', etapa: 'Pintura Externa', atividade: 'Textura acrílica externa', grupoSinapi: 'Pintura Externa', sinapiCodigo: '95305', unidade: 'm²' },
  { fase: 'Pintura', etapa: 'Pintura Externa', atividade: 'Pintura acrílica externa', grupoSinapi: 'Pintura Externa', sinapiCodigo: '104641', unidade: 'm²' },

  // ====== COBERTURA ======
  { fase: 'Cobertura', etapa: 'Estrutura', atividade: 'Estrutura de madeira para telhado', grupoSinapi: 'Estrutura para Telhado', sinapiCodigo: '92539', unidade: 'm²' },
  { fase: 'Cobertura', etapa: 'Telhamento', atividade: 'Telha cerâmica', grupoSinapi: 'Telhamento', sinapiCodigo: '94443', unidade: 'm²' },
  { fase: 'Cobertura', etapa: 'Telhamento', atividade: 'Telha de fibrocimento', grupoSinapi: 'Telhamento', sinapiCodigo: '94207', unidade: 'm²' },
  { fase: 'Cobertura', etapa: 'Calha', atividade: 'Calha e rufos', grupoSinapi: 'Calhas e Rufos', sinapiCodigo: '94229', unidade: 'm' },

  // ====== ESQUADRIAS ======
  { fase: 'Esquadrias', etapa: 'Portas', atividade: 'Porta de madeira interna', grupoSinapi: 'Portas', sinapiCodigo: '91330', unidade: 'un' },
  { fase: 'Esquadrias', etapa: 'Portas', atividade: 'Porta de alumínio', grupoSinapi: 'Portas', sinapiCodigo: '94805', unidade: 'un' },
  { fase: 'Esquadrias', etapa: 'Janelas', atividade: 'Janela de alumínio', grupoSinapi: 'Janelas', sinapiCodigo: '105809', unidade: 'm²' },
  { fase: 'Esquadrias', etapa: 'Vidros', atividade: 'Vidro temperado', grupoSinapi: 'Vidros', sinapiCodigo: '102182', unidade: 'm²' },

  // ====== ACABAMENTO ======
  { fase: 'Acabamento', etapa: 'Soleira e Peitoril', atividade: 'Soleira de granito', grupoSinapi: 'Soleiras e Peitoris', sinapiCodigo: '98689', unidade: 'm' },
  { fase: 'Acabamento', etapa: 'Soleira e Peitoril', atividade: 'Peitoril de granito', grupoSinapi: 'Soleiras e Peitoris', sinapiCodigo: '101965', unidade: 'm' },
  { fase: 'Acabamento', etapa: 'Rodapé', atividade: 'Rodapé cerâmico', grupoSinapi: 'Rodapés', sinapiCodigo: '88649', unidade: 'm' },

  // ====== INFRAESTRUTURA EXTERNA ======
  { fase: 'Infraestrutura Externa', etapa: 'Pavimentação', atividade: 'Piso intertravado', grupoSinapi: 'Pavimentação', sinapiCodigo: '104428', unidade: 'm²' },
  { fase: 'Infraestrutura Externa', etapa: 'Drenagem', atividade: 'Drenagem pluvial', grupoSinapi: 'Drenagem', sinapiCodigo: '99322', unidade: 'un' },
  { fase: 'Infraestrutura Externa', etapa: 'Muro', atividade: 'Muro de divisa', grupoSinapi: 'Muros e Arrimos', sinapiCodigo: '100351', unidade: 'm²' },

  // ====== LIMPEZA ======
  { fase: 'Limpeza', etapa: 'Limpeza Final', atividade: 'Limpeza final da obra', grupoSinapi: 'Limpeza de Obra', sinapiCodigo: '99801', unidade: 'm²' },
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

  const withCodigo = MAPPINGS.filter(m => m.sinapiCodigo).length
  console.log(`${withCodigo} de ${MAPPINGS.length} com sinapiCodigo preenchido`)
  console.log('Seed finalizado!')
}

main()
  .catch((e) => {
    console.error('Erro no seed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
