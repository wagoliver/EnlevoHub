import { PrismaClient } from '@prisma/client'
import { ServicoTemplateService } from './servico-template.service'

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

export class ActivityServiceLinkService {
  private templateService: ServicoTemplateService

  constructor(private prisma: PrismaClient) {
    this.templateService = new ServicoTemplateService(prisma)
  }

  /**
   * Auto-link: match project STAGEs with ServicoTemplates by name similarity.
   * Idempotent — skips pairs that already exist.
   */
  async autoLink(tenantId: string, projectId: string) {
    // Get all STAGE-level activities for this project
    const stages = await this.prisma.projectActivity.findMany({
      where: { projectId, level: 'STAGE' },
      select: { id: true, name: true },
    })

    if (stages.length === 0) {
      return { linked: 0, message: 'Nenhuma etapa (STAGE) encontrada no projeto' }
    }

    // Ensure templates exist (auto-seed on first use)
    await this.templateService.seedDefaults(tenantId)

    // Get all active templates for this tenant
    const templates = await this.prisma.servicoTemplate.findMany({
      where: { tenantId, ativo: true },
      select: { id: true, etapa: true },
    })

    if (templates.length === 0) {
      return { linked: 0, message: 'Nenhum template de servico encontrado' }
    }

    // Build normalized list of stages
    const normalizedStages = stages.map((stage) => ({
      id: stage.id,
      normalized: normalize(stage.name),
    }))

    // Match templates to activities using exact normalized matching.
    // With DEFAULT_TEMPLATES aligned to STAGE names, this gives precise matches.
    const linksToCreate: { projectActivityId: string; servicoTemplateId: string }[] = []

    for (const template of templates) {
      const normalizedEtapa = normalize(template.etapa)

      for (const stage of normalizedStages) {
        if (stage.normalized === normalizedEtapa) {
          linksToCreate.push({
            projectActivityId: stage.id,
            servicoTemplateId: template.id,
          })
        }
      }
    }

    if (linksToCreate.length === 0) {
      return { linked: 0, message: 'Nenhum match encontrado entre atividades e templates' }
    }

    // Upsert (skipDuplicates for idempotency)
    const result = await this.prisma.activityServiceLink.createMany({
      data: linksToCreate,
      skipDuplicates: true,
    })

    return { linked: result.count, total: linksToCreate.length }
  }

  /**
   * Get templates grouped by project activity.
   * Returns phases (PHASE > STAGE > ACTIVITY hierarchy) + activityGroups (legacy) + unlinkedTemplates.
   */
  async getTemplatesForProject(tenantId: string, projectId: string) {
    // Get ALL project activities (PHASE, STAGE, ACTIVITY) for the hierarchy
    const allActivities = await this.prisma.projectActivity.findMany({
      where: { projectId },
      select: {
        id: true,
        name: true,
        level: true,
        color: true,
        order: true,
        parentId: true,
        sinapiCodigo: true,
        areaTipo: true,
        tags: true,
        padrao: true,
        serviceLinks: {
          select: {
            id: true,
            servicoTemplateId: true,
            isDefault: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    })

    // Separate by level
    const phaseActivities = allActivities.filter(a => a.level === 'PHASE')
    const stageActivities = allActivities.filter(a => a.level === 'STAGE')
    const leafActivities = allActivities.filter(a => a.level === 'ACTIVITY')

    // Check if project has SINAPI-enabled activities (new mode)
    const hasSinapiActivities = leafActivities.some(a => !!a.sinapiCodigo)

    // Enrich leaf activities with SINAPI composicao data
    const actSinapiCodigos = leafActivities
      .map(a => a.sinapiCodigo)
      .filter((c): c is string => !!c)

    const actComposicoes = actSinapiCodigos.length > 0
      ? await this.prisma.sinapiComposicao.findMany({
          where: { codigo: { in: actSinapiCodigos } },
          select: { codigo: true, descricao: true, unidade: true },
        })
      : []

    const actCompMap = new Map(actComposicoes.map(c => [c.codigo, c]))

    // Build PHASE > STAGE > ACTIVITY hierarchy
    const phases = phaseActivities.map(phase => {
      const phaseStages = stageActivities
        .filter(s => s.parentId === phase.id)
        .map(stage => {
          const stageLeaves = leafActivities
            .filter(a => a.parentId === stage.id)
            .map(act => {
              const comp = act.sinapiCodigo ? actCompMap.get(act.sinapiCodigo) : null
              return {
                id: act.id,
                name: act.name,
                sinapiCodigo: act.sinapiCodigo,
                areaTipo: act.areaTipo,
                tags: act.tags,
                padrao: act.padrao,
                sinapiDescricao: comp?.descricao || null,
                unidade: comp?.unidade || null,
                linkedTemplates: act.serviceLinks,
              }
            })

          return {
            id: stage.id,
            name: stage.name,
            color: stage.color,
            activities: stageLeaves,
          }
        })

      return {
        id: phase.id,
        name: phase.name,
        color: phase.color,
        stages: phaseStages,
      }
    })

    // === Legacy backward-compat: activityGroups + unlinkedTemplates ===
    // Ensure templates exist (auto-seed on first use)
    await this.templateService.seedDefaults(tenantId)

    // Get all active templates for this tenant (enriched)
    const templates = await this.prisma.servicoTemplate.findMany({
      where: { tenantId, ativo: true },
      orderBy: [{ order: 'asc' }, { etapa: 'asc' }],
    })

    // Enrich with SINAPI data
    const codigos = templates
      .map((t) => t.sinapiCodigo)
      .filter((c): c is string => !!c)

    const composicoes = codigos.length > 0
      ? await this.prisma.sinapiComposicao.findMany({
          where: { codigo: { in: codigos } },
          select: { codigo: true, descricao: true, unidade: true },
        })
      : []

    const compMap = new Map(composicoes.map((c) => [c.codigo, c]))

    const enrichedTemplates = templates.map((t) => {
      const comp = t.sinapiCodigo ? compMap.get(t.sinapiCodigo) : null
      return {
        ...t,
        nome: t.nomeCustom || comp?.descricao || '(sem nome)',
        unidade: comp?.unidade || 'UN',
        sinapiDescricao: comp?.descricao || null,
      }
    })

    // Build a set of all linked template IDs
    const linkedTemplateIds = new Set<string>()
    for (const stage of stageActivities) {
      for (const link of stage.serviceLinks) {
        linkedTemplateIds.add(link.servicoTemplateId)
      }
    }

    // Build activity groups (legacy format)
    const activityGroups = stageActivities.map((stage) => {
      const linkedIds = stage.serviceLinks.map((l) => l.servicoTemplateId)
      const stageTemplates = enrichedTemplates.filter((t) => linkedIds.includes(t.id))
      const parentPhase = phaseActivities.find(p => p.id === stage.parentId)

      return {
        activity: {
          id: stage.id,
          name: stage.name,
          parentName: parentPhase?.name || null,
          color: stage.color,
        },
        templates: stageTemplates,
      }
    })

    // Unlinked templates
    const unlinkedTemplates = enrichedTemplates.filter((t) => !linkedTemplateIds.has(t.id))

    return { phases, hasSinapiActivities, activityGroups, unlinkedTemplates }
  }

  /**
   * Manual link: create a specific link between activity and template
   */
  async link(projectActivityId: string, servicoTemplateId: string) {
    return this.prisma.activityServiceLink.create({
      data: { projectActivityId, servicoTemplateId },
    })
  }

  /**
   * Remove a link
   */
  async unlink(id: string) {
    await this.prisma.activityServiceLink.delete({ where: { id } })
    return { deleted: true }
  }
}
