/**
 * Seeds the default "Construção Residencial Padrão" template for a new tenant.
 * Called automatically during company registration.
 */

type PrismaTx = {
  activityTemplate: {
    create: (args: any) => Promise<any>
  }
  activityTemplateItem: {
    create: (args: any) => Promise<any>
  }
}

interface ActivityDef {
  name: string
  order: number
  weight: number
  durationDays: number
  deps?: string[]
  sinapiCodigo?: string
  areaTipo?: string
  tags?: string[]
  padrao?: boolean
}

async function createActivities(
  tx: PrismaTx,
  templateId: string,
  parentId: string,
  activities: ActivityDef[]
) {
  for (const act of activities) {
    await tx.activityTemplateItem.create({
      data: {
        templateId,
        name: act.name,
        order: act.order,
        weight: act.weight,
        level: 'ACTIVITY',
        parentId,
        durationDays: act.durationDays,
        dependencies: act.deps || null,
        sinapiCodigo: act.sinapiCodigo || null,
        areaTipo: act.areaTipo || null,
        tags: act.tags || [],
        padrao: act.padrao ?? true,
      },
    })
  }
}

async function createStage(
  tx: PrismaTx,
  templateId: string,
  phaseId: string,
  name: string,
  order: number,
  activities: ActivityDef[]
) {
  const stage = await tx.activityTemplateItem.create({
    data: {
      templateId,
      name,
      order,
      weight: 1,
      level: 'STAGE',
      parentId: phaseId,
    },
  })
  await createActivities(tx, templateId, stage.id, activities)
  return stage
}

export async function seedDefaultTemplate(tx: PrismaTx, tenantId: string) {
  const template = await tx.activityTemplate.create({
    data: {
      tenantId,
      name: 'Construção Residencial Padrão',
      description:
        'Template padrão para construção residencial completa, com todas as fases desde serviços preliminares até entrega das chaves.',
    },
  })

  const tid = template.id

  // ========== FASE 1: Serviços Preliminares (5%) ==========
  const fase1 = await tx.activityTemplateItem.create({
    data: { templateId: tid, name: 'Serviços Preliminares', order: 0, weight: 1, level: 'PHASE', percentageOfTotal: 5, color: '#6366F1' },
  })

  await createStage(tx, tid, fase1.id, 'Preparação do Terreno', 0, [
    { name: 'Limpeza do terreno', order: 0, weight: 1, durationDays: 3 },
    { name: 'Topografia e demarcação', order: 1, weight: 1, durationDays: 2 },
    { name: 'Instalações provisórias (água, energia, tapume)', order: 2, weight: 2, durationDays: 5 },
    { name: 'Mobilização de equipamentos', order: 3, weight: 1, durationDays: 2 },
  ])

  // ========== FASE 2: Fundação (10%) ==========
  const fase2 = await tx.activityTemplateItem.create({
    data: { templateId: tid, name: 'Fundação', order: 1, weight: 1, level: 'PHASE', percentageOfTotal: 10, color: '#F59E0B' },
  })

  await createStage(tx, tid, fase2.id, 'Infraestrutura', 0, [
    { name: 'Escavação', order: 0, weight: 2, durationDays: 5 },
    { name: 'Estacas / Sapatas', order: 1, weight: 3, durationDays: 10, deps: ['Escavação'] },
    { name: 'Blocos e vigas baldrame', order: 2, weight: 3, durationDays: 8, deps: ['Estacas / Sapatas'] },
    { name: 'Impermeabilização da fundação', order: 3, weight: 1, durationDays: 3, deps: ['Blocos e vigas baldrame'] },
    { name: 'Aterro e compactação', order: 4, weight: 1, durationDays: 3, deps: ['Impermeabilização da fundação'] },
  ])

  // ========== FASE 3: Estrutura (20%) ==========
  const fase3 = await tx.activityTemplateItem.create({
    data: { templateId: tid, name: 'Estrutura', order: 2, weight: 1, level: 'PHASE', percentageOfTotal: 20, color: '#EF4444' },
  })

  await createStage(tx, tid, fase3.id, 'Estrutura de Concreto', 0, [
    { name: 'Pilares térreo', order: 0, weight: 3, durationDays: 8 },
    { name: 'Vigas e lajes térreo', order: 1, weight: 4, durationDays: 12, deps: ['Pilares térreo'] },
    { name: 'Pilares pavimento superior', order: 2, weight: 3, durationDays: 8, deps: ['Vigas e lajes térreo'] },
    { name: 'Vigas e lajes pavimento superior', order: 3, weight: 4, durationDays: 12, deps: ['Pilares pavimento superior'] },
    { name: 'Escadas', order: 4, weight: 2, durationDays: 5, deps: ['Vigas e lajes térreo'] },
    { name: 'Reservatório superior', order: 5, weight: 1, durationDays: 3, deps: ['Vigas e lajes pavimento superior'] },
  ])

  // ========== FASE 4: Alvenaria e Cobertura (15%) ==========
  const fase4 = await tx.activityTemplateItem.create({
    data: { templateId: tid, name: 'Alvenaria e Cobertura', order: 3, weight: 1, level: 'PHASE', percentageOfTotal: 15, color: '#10B981' },
  })

  await createStage(tx, tid, fase4.id, 'Alvenaria', 0, [
    { name: 'Alvenaria externa', order: 0, weight: 3, durationDays: 15, sinapiCodigo: '103324', areaTipo: 'PAREDE_LIQ' },
    { name: 'Alvenaria interna', order: 1, weight: 3, durationDays: 12, sinapiCodigo: '103324', areaTipo: 'PAREDE_LIQ' },
    { name: 'Vergas e contravergas', order: 2, weight: 1, durationDays: 5 },
  ])

  await createStage(tx, tid, fase4.id, 'Cobertura', 1, [
    { name: 'Estrutura do telhado (madeiramento)', order: 0, weight: 2, durationDays: 8 },
    { name: 'Colocação das telhas', order: 1, weight: 2, durationDays: 5, deps: ['Estrutura do telhado (madeiramento)'] },
    { name: 'Calhas e rufos', order: 2, weight: 1, durationDays: 3, deps: ['Colocação das telhas'] },
  ])

  // ========== FASE 5: Instalações (15%) ==========
  const fase5 = await tx.activityTemplateItem.create({
    data: { templateId: tid, name: 'Instalações', order: 4, weight: 1, level: 'PHASE', percentageOfTotal: 15, color: '#3B82F6' },
  })

  await createStage(tx, tid, fase5.id, 'Instalações Hidráulicas', 0, [
    { name: 'Tubulação de água fria e quente', order: 0, weight: 2, durationDays: 10 },
    { name: 'Tubulação de esgoto', order: 1, weight: 2, durationDays: 8 },
    { name: 'Tubulação de águas pluviais', order: 2, weight: 1, durationDays: 4 },
  ])

  await createStage(tx, tid, fase5.id, 'Instalações Elétricas', 1, [
    { name: 'Eletrodutos e caixas', order: 0, weight: 2, durationDays: 8 },
    { name: 'Fiação', order: 1, weight: 2, durationDays: 6, deps: ['Eletrodutos e caixas'] },
    { name: 'Quadro de distribuição', order: 2, weight: 1, durationDays: 2, deps: ['Fiação'] },
    { name: 'Instalação de telefone/dados/TV', order: 3, weight: 1, durationDays: 3 },
  ])

  // ========== FASE 6: Revestimentos (15%) ==========
  const fase6 = await tx.activityTemplateItem.create({
    data: { templateId: tid, name: 'Revestimentos', order: 5, weight: 1, level: 'PHASE', percentageOfTotal: 15, color: '#8B5CF6' },
  })

  await createStage(tx, tid, fase6.id, 'Revestimento Interno', 0, [
    { name: 'Chapisco e emboço interno', order: 0, weight: 3, durationDays: 12, sinapiCodigo: '87879', areaTipo: 'PAREDE_LIQ' },
    { name: 'Reboco interno', order: 1, weight: 3, durationDays: 10, deps: ['Chapisco e emboço interno'], sinapiCodigo: '87535', areaTipo: 'PAREDE_LIQ' },
    { name: 'Contrapiso', order: 2, weight: 2, durationDays: 5, sinapiCodigo: '87620', areaTipo: 'PISO' },
    { name: 'Revestimento cerâmico (paredes)', order: 3, weight: 2, durationDays: 8, deps: ['Reboco interno'], sinapiCodigo: '87265', areaTipo: 'PAREDE_LIQ', tags: ['AREA_MOLHADA'] },
    { name: 'Piso cerâmico / porcelanato', order: 4, weight: 2, durationDays: 8, deps: ['Contrapiso'], sinapiCodigo: '87263', areaTipo: 'PISO' },
  ])

  await createStage(tx, tid, fase6.id, 'Revestimento Externo', 1, [
    { name: 'Chapisco e emboço externo', order: 0, weight: 2, durationDays: 10, sinapiCodigo: '87879', areaTipo: 'PAREDE_LIQ' },
    { name: 'Reboco externo', order: 1, weight: 2, durationDays: 8, deps: ['Chapisco e emboço externo'], sinapiCodigo: '87535', areaTipo: 'PAREDE_LIQ' },
    { name: 'Textura / Pintura externa', order: 2, weight: 2, durationDays: 6, deps: ['Reboco externo'], sinapiCodigo: '88489', areaTipo: 'PAREDE_LIQ' },
  ])

  // ========== FASE 7: Acabamentos e Entrega (20%) ==========
  const fase7 = await tx.activityTemplateItem.create({
    data: { templateId: tid, name: 'Acabamentos e Entrega', order: 6, weight: 1, level: 'PHASE', percentageOfTotal: 20, color: '#EC4899' },
  })

  await createStage(tx, tid, fase7.id, 'Esquadrias e Vidros', 0, [
    { name: 'Portas internas e externas', order: 0, weight: 2, durationDays: 5 },
    { name: 'Janelas e vidros', order: 1, weight: 2, durationDays: 5 },
    { name: 'Box de banheiro', order: 2, weight: 1, durationDays: 2 },
  ])

  await createStage(tx, tid, fase7.id, 'Louças, Metais e Pintura', 1, [
    { name: 'Louças sanitárias', order: 0, weight: 1, durationDays: 3 },
    { name: 'Metais e acessórios', order: 1, weight: 1, durationDays: 2 },
    { name: 'Bancadas (granito/mármore)', order: 2, weight: 1, durationDays: 3 },
    { name: 'Pintura interna (massa corrida + tinta)', order: 3, weight: 3, durationDays: 10, sinapiCodigo: '88489', areaTipo: 'PAREDE_LIQ' },
    { name: 'Instalação de interruptores e tomadas', order: 4, weight: 1, durationDays: 2, deps: ['Pintura interna (massa corrida + tinta)'], sinapiCodigo: '91947', areaTipo: 'MANUAL' },
  ])

  await createStage(tx, tid, fase7.id, 'Finalização', 2, [
    { name: 'Limpeza geral da obra', order: 0, weight: 1, durationDays: 3 },
    { name: 'Paisagismo e áreas externas', order: 1, weight: 2, durationDays: 5 },
    { name: 'Vistoria e correções', order: 2, weight: 2, durationDays: 5, deps: ['Limpeza geral da obra'] },
    { name: 'Habite-se e documentação', order: 3, weight: 1, durationDays: 5, deps: ['Vistoria e correções'] },
  ])

  return template
}
