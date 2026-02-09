import { PrismaClient } from '@prisma/client'

export interface ContractorScope {
  contractorId?: string
  projectIds?: string[]
  activityIds?: string[]
}

/**
 * Extract contractor scope from request.
 * If the user is a CONTRACTOR, returns their contractorId and the project IDs
 * they are assigned to. Otherwise returns empty (no filtering).
 */
export async function getContractorScope(
  request: any,
  prisma: PrismaClient
): Promise<ContractorScope> {
  const user = request.user
  if (!user || user.role !== 'CONTRACTOR' || !user.contractorId) {
    return {}
  }

  const contractorId = user.contractorId

  // Get projects and activities assigned to this contractor
  const [contractorProjects, contractorActivities] = await Promise.all([
    prisma.contractorProject.findMany({
      where: { contractorId },
      select: { projectId: true }
    }),
    prisma.contractorActivity.findMany({
      where: { contractorId },
      select: { projectActivityId: true }
    }),
  ])

  const projectIds = contractorProjects.map(cp => cp.projectId)
  const activityIds = contractorActivities.map(ca => ca.projectActivityId)

  return { contractorId, projectIds, activityIds }
}
