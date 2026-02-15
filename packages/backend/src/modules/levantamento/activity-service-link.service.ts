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

    // Match templates to activities using substring matching:
    // template.etapa "Revestimento" matches stage "Revestimento Interno"
    // stage "Alvenaria" matches template.etapa "Alvenaria"
    const linksToCreate: { projectActivityId: string; servicoTemplateId: string }[] = []

    for (const template of templates) {
      const normalizedEtapa = normalize(template.etapa)

      for (const stage of normalizedStages) {
        // Match if one contains the other (e.g. "revestimento" ⊂ "revestimento interno")
        if (stage.normalized.includes(normalizedEtapa) || normalizedEtapa.includes(stage.normalized)) {
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
   * Returns activityGroups + unlinkedTemplates.
   */
  async getTemplatesForProject(tenantId: string, projectId: string) {
    // Get all STAGE activities with their parent (PHASE) info
    const stages = await this.prisma.projectActivity.findMany({
      where: { projectId, level: 'STAGE' },
      select: {
        id: true,
        name: true,
        color: true,
        order: true,
        parent: { select: { id: true, name: true } },
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
    for (const stage of stages) {
      for (const link of stage.serviceLinks) {
        linkedTemplateIds.add(link.servicoTemplateId)
      }
    }

    // Build activity groups
    const activityGroups = stages.map((stage) => {
      const linkedIds = stage.serviceLinks.map((l) => l.servicoTemplateId)
      const stageTemplates = enrichedTemplates.filter((t) => linkedIds.includes(t.id))

      return {
        activity: {
          id: stage.id,
          name: stage.name,
          parentName: stage.parent?.name || null,
          color: stage.color,
        },
        templates: stageTemplates,
      }
    })

    // Unlinked templates
    const unlinkedTemplates = enrichedTemplates.filter((t) => !linkedTemplateIds.has(t.id))

    return { activityGroups, unlinkedTemplates }
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
