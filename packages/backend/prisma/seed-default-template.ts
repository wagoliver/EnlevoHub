import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Get the first tenant
  const tenant = await prisma.tenant.findFirst()
  if (!tenant) {
    console.log('Nenhum tenant encontrado. Crie um tenant primeiro.')
    return
  }

  console.log(`Tenant: ${tenant.name} (${tenant.id})`)

  // Check if template already exists
  const existing = await prisma.activityTemplate.findFirst({
    where: { tenantId: tenant.id, name: 'Construção Residencial Padrão' },
  })
  if (existing) {
    console.log('Template "Construção Residencial Padrão" já existe. Pulando.')
    return
  }

  // Create the template
  const template = await prisma.activityTemplate.create({
    data: {
      tenantId: tenant.id,
      name: 'Construção Residencial Padrão',
      description:
        'Template padrão para construção residencial completa, com todas as fases desde serviços preliminares até entrega das chaves.',
    },
  })

  console.log(`Template criado: ${template.id}`)

  // ========== FASE 1: Serviços Preliminares (5%) ==========
  const fase1 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Serviços Preliminares',
      order: 0,
      weight: 1,
      level: 'PHASE',
      percentageOfTotal: 5,
      color: '#6366F1',
    },
  })

  const fase1_etapa1 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Preparação do Terreno',
      order: 0,
      weight: 1,
      level: 'STAGE',
      parentId: fase1.id,
    },
  })

  for (const act of [
    { name: 'Limpeza do terreno', order: 0, weight: 1, durationDays: 3 },
    { name: 'Topografia e demarcação', order: 1, weight: 1, durationDays: 2 },
    { name: 'Instalações provisórias (água, energia, tapume)', order: 2, weight: 2, durationDays: 5 },
    { name: 'Mobilização de equipamentos', order: 3, weight: 1, durationDays: 2 },
  ]) {
    await prisma.activityTemplateItem.create({
      data: {
        templateId: template.id,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId: fase1_etapa1.id,
        durationDays: act.durationDays,
      },
    })
  }

  // ========== FASE 2: Fundação (10%) ==========
  const fase2 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Fundação',
      order: 1,
      weight: 1,
      level: 'PHASE',
      percentageOfTotal: 10,
      color: '#F59E0B',
    },
  })

  const fase2_etapa1 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Infraestrutura',
      order: 0,
      weight: 1,
      level: 'STAGE',
      parentId: fase2.id,
    },
  })

  for (const act of [
    { name: 'Escavação', order: 0, weight: 2, durationDays: 5 },
    { name: 'Estacas / Sapatas', order: 1, weight: 3, durationDays: 10, deps: ['Escavação'] },
    { name: 'Blocos e vigas baldrame', order: 2, weight: 3, durationDays: 8, deps: ['Estacas / Sapatas'] },
    { name: 'Impermeabilização da fundação', order: 3, weight: 1, durationDays: 3, deps: ['Blocos e vigas baldrame'] },
    { name: 'Aterro e compactação', order: 4, weight: 1, durationDays: 3, deps: ['Impermeabilização da fundação'] },
  ]) {
    await prisma.activityTemplateItem.create({
      data: {
        templateId: template.id,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId: fase2_etapa1.id,
        durationDays: act.durationDays,
        dependencies: (act as any).deps || null,
      },
    })
  }

  // ========== FASE 3: Estrutura (20%) ==========
  const fase3 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Estrutura',
      order: 2,
      weight: 1,
      level: 'PHASE',
      percentageOfTotal: 20,
      color: '#EF4444',
    },
  })

  const fase3_etapa1 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Estrutura de Concreto',
      order: 0,
      weight: 1,
      level: 'STAGE',
      parentId: fase3.id,
    },
  })

  for (const act of [
    { name: 'Pilares térreo', order: 0, weight: 3, durationDays: 8 },
    { name: 'Vigas e lajes térreo', order: 1, weight: 4, durationDays: 12, deps: ['Pilares térreo'] },
    { name: 'Pilares pavimento superior', order: 2, weight: 3, durationDays: 8, deps: ['Vigas e lajes térreo'] },
    { name: 'Vigas e lajes pavimento superior', order: 3, weight: 4, durationDays: 12, deps: ['Pilares pavimento superior'] },
    { name: 'Escadas', order: 4, weight: 2, durationDays: 5, deps: ['Vigas e lajes térreo'] },
    { name: 'Reservatório superior', order: 5, weight: 1, durationDays: 3, deps: ['Vigas e lajes pavimento superior'] },
  ]) {
    await prisma.activityTemplateItem.create({
      data: {
        templateId: template.id,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId: fase3_etapa1.id,
        durationDays: act.durationDays,
        dependencies: (act as any).deps || null,
      },
    })
  }

  // ========== FASE 4: Alvenaria e Cobertura (15%) ==========
  const fase4 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Alvenaria e Cobertura',
      order: 3,
      weight: 1,
      level: 'PHASE',
      percentageOfTotal: 15,
      color: '#10B981',
    },
  })

  const fase4_etapa1 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Alvenaria',
      order: 0,
      weight: 1,
      level: 'STAGE',
      parentId: fase4.id,
    },
  })

  for (const act of [
    { name: 'Alvenaria externa', order: 0, weight: 3, durationDays: 15 },
    { name: 'Alvenaria interna', order: 1, weight: 3, durationDays: 12 },
    { name: 'Vergas e contravergas', order: 2, weight: 1, durationDays: 5 },
  ]) {
    await prisma.activityTemplateItem.create({
      data: {
        templateId: template.id,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId: fase4_etapa1.id,
        durationDays: act.durationDays,
      },
    })
  }

  const fase4_etapa2 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Cobertura',
      order: 1,
      weight: 1,
      level: 'STAGE',
      parentId: fase4.id,
    },
  })

  for (const act of [
    { name: 'Estrutura do telhado (madeiramento)', order: 0, weight: 2, durationDays: 8 },
    { name: 'Colocação das telhas', order: 1, weight: 2, durationDays: 5, deps: ['Estrutura do telhado (madeiramento)'] },
    { name: 'Calhas e rufos', order: 2, weight: 1, durationDays: 3, deps: ['Colocação das telhas'] },
  ]) {
    await prisma.activityTemplateItem.create({
      data: {
        templateId: template.id,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId: fase4_etapa2.id,
        durationDays: act.durationDays,
        dependencies: (act as any).deps || null,
      },
    })
  }

  // ========== FASE 5: Instalações (15%) ==========
  const fase5 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Instalações',
      order: 4,
      weight: 1,
      level: 'PHASE',
      percentageOfTotal: 15,
      color: '#3B82F6',
    },
  })

  const fase5_etapa1 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Instalações Hidráulicas',
      order: 0,
      weight: 1,
      level: 'STAGE',
      parentId: fase5.id,
    },
  })

  for (const act of [
    { name: 'Tubulação de água fria e quente', order: 0, weight: 2, durationDays: 10 },
    { name: 'Tubulação de esgoto', order: 1, weight: 2, durationDays: 8 },
    { name: 'Tubulação de águas pluviais', order: 2, weight: 1, durationDays: 4 },
  ]) {
    await prisma.activityTemplateItem.create({
      data: {
        templateId: template.id,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId: fase5_etapa1.id,
        durationDays: act.durationDays,
      },
    })
  }

  const fase5_etapa2 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Instalações Elétricas',
      order: 1,
      weight: 1,
      level: 'STAGE',
      parentId: fase5.id,
    },
  })

  for (const act of [
    { name: 'Eletrodutos e caixas', order: 0, weight: 2, durationDays: 8 },
    { name: 'Fiação', order: 1, weight: 2, durationDays: 6, deps: ['Eletrodutos e caixas'] },
    { name: 'Quadro de distribuição', order: 2, weight: 1, durationDays: 2, deps: ['Fiação'] },
    { name: 'Instalação de telefone/dados/TV', order: 3, weight: 1, durationDays: 3 },
  ]) {
    await prisma.activityTemplateItem.create({
      data: {
        templateId: template.id,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId: fase5_etapa2.id,
        durationDays: act.durationDays,
        dependencies: (act as any).deps || null,
      },
    })
  }

  // ========== FASE 6: Revestimentos (15%) ==========
  const fase6 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Revestimentos',
      order: 5,
      weight: 1,
      level: 'PHASE',
      percentageOfTotal: 15,
      color: '#8B5CF6',
    },
  })

  const fase6_etapa1 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Revestimento Interno',
      order: 0,
      weight: 1,
      level: 'STAGE',
      parentId: fase6.id,
    },
  })

  for (const act of [
    { name: 'Chapisco e emboço interno', order: 0, weight: 3, durationDays: 12 },
    { name: 'Reboco interno', order: 1, weight: 3, durationDays: 10, deps: ['Chapisco e emboço interno'] },
    { name: 'Contrapiso', order: 2, weight: 2, durationDays: 5 },
    { name: 'Revestimento cerâmico (paredes)', order: 3, weight: 2, durationDays: 8, deps: ['Reboco interno'] },
    { name: 'Piso cerâmico / porcelanato', order: 4, weight: 2, durationDays: 8, deps: ['Contrapiso'] },
  ]) {
    await prisma.activityTemplateItem.create({
      data: {
        templateId: template.id,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId: fase6_etapa1.id,
        durationDays: act.durationDays,
        dependencies: (act as any).deps || null,
      },
    })
  }

  const fase6_etapa2 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Revestimento Externo',
      order: 1,
      weight: 1,
      level: 'STAGE',
      parentId: fase6.id,
    },
  })

  for (const act of [
    { name: 'Chapisco e emboço externo', order: 0, weight: 2, durationDays: 10 },
    { name: 'Reboco externo', order: 1, weight: 2, durationDays: 8, deps: ['Chapisco e emboço externo'] },
    { name: 'Textura / Pintura externa', order: 2, weight: 2, durationDays: 6, deps: ['Reboco externo'] },
  ]) {
    await prisma.activityTemplateItem.create({
      data: {
        templateId: template.id,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId: fase6_etapa2.id,
        durationDays: act.durationDays,
        dependencies: (act as any).deps || null,
      },
    })
  }

  // ========== FASE 7: Acabamentos e Entrega (20%) ==========
  const fase7 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Acabamentos e Entrega',
      order: 6,
      weight: 1,
      level: 'PHASE',
      percentageOfTotal: 20,
      color: '#EC4899',
    },
  })

  const fase7_etapa1 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Esquadrias e Vidros',
      order: 0,
      weight: 1,
      level: 'STAGE',
      parentId: fase7.id,
    },
  })

  for (const act of [
    { name: 'Portas internas e externas', order: 0, weight: 2, durationDays: 5 },
    { name: 'Janelas e vidros', order: 1, weight: 2, durationDays: 5 },
    { name: 'Box de banheiro', order: 2, weight: 1, durationDays: 2 },
  ]) {
    await prisma.activityTemplateItem.create({
      data: {
        templateId: template.id,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId: fase7_etapa1.id,
        durationDays: act.durationDays,
      },
    })
  }

  const fase7_etapa2 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Louças, Metais e Pintura',
      order: 1,
      weight: 1,
      level: 'STAGE',
      parentId: fase7.id,
    },
  })

  for (const act of [
    { name: 'Louças sanitárias', order: 0, weight: 1, durationDays: 3 },
    { name: 'Metais e acessórios', order: 1, weight: 1, durationDays: 2 },
    { name: 'Bancadas (granito/mármore)', order: 2, weight: 1, durationDays: 3 },
    { name: 'Pintura interna (massa corrida + tinta)', order: 3, weight: 3, durationDays: 10 },
    { name: 'Instalação de interruptores e tomadas', order: 4, weight: 1, durationDays: 2, deps: ['Pintura interna (massa corrida + tinta)'] },
  ]) {
    await prisma.activityTemplateItem.create({
      data: {
        templateId: template.id,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId: fase7_etapa2.id,
        durationDays: act.durationDays,
        dependencies: (act as any).deps || null,
      },
    })
  }

  const fase7_etapa3 = await prisma.activityTemplateItem.create({
    data: {
      templateId: template.id,
      name: 'Finalização',
      order: 2,
      weight: 1,
      level: 'STAGE',
      parentId: fase7.id,
    },
  })

  for (const act of [
    { name: 'Limpeza geral da obra', order: 0, weight: 1, durationDays: 3 },
    { name: 'Paisagismo e áreas externas', order: 1, weight: 2, durationDays: 5 },
    { name: 'Vistoria e correções', order: 2, weight: 2, durationDays: 5, deps: ['Limpeza geral da obra'] },
    { name: 'Habite-se e documentação', order: 3, weight: 1, durationDays: 5, deps: ['Vistoria e correções'] },
  ]) {
    await prisma.activityTemplateItem.create({
      data: {
        templateId: template.id,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId: fase7_etapa3.id,
        durationDays: act.durationDays,
        dependencies: (act as any).deps || null,
      },
    })
  }

  // Count items
  const count = await prisma.activityTemplateItem.count({
    where: { templateId: template.id },
  })

  console.log(`\nTemplate "Construção Residencial Padrão" criado com sucesso!`)
  console.log(`  - 7 fases (5% + 10% + 20% + 15% + 15% + 15% + 20% = 100%)`)
  console.log(`  - ${count} itens no total (fases + etapas + atividades)`)
}

main()
  .catch((e) => {
    console.error('Erro:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
