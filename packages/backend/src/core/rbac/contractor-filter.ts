import { PrismaClient } from '@prisma/client'

export interface ContractorScope {
  contractorId?: string
  projectIds?: string[]
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

  // Get projects assigned to this contractor
  const contractorProjects = await prisma.contractorProject.findMany({
    where: { contractorId },
    select: { projectId: true }
  })

  const projectIds = contractorProjects.map(cp => cp.projectId)

  return { contractorId, projectIds }
}
