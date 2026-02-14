import { useQuery } from '@tanstack/react-query'
import { projectsAPI, suppliersAPI, contractorsAPI, financialAPI } from '@/lib/api-client'

export interface StepStatus {
  fulfilled: boolean
  label: string
}

export type WorkflowStatus = Record<number, StepStatus>

export function useWorkflowStatus() {
  // Step 1: at least 1 project
  const { data: projectsData } = useQuery({
    queryKey: ['workflow-check', 'projects'],
    queryFn: () => projectsAPI.list({ limit: 1 }),
    staleTime: 1000 * 60 * 10,
  })

  // Step 2: at least 1 purchase order
  const { data: purchasesData } = useQuery({
    queryKey: ['workflow-check', 'purchases'],
    queryFn: () => suppliersAPI.listPurchaseOrders({ limit: 1 }),
    staleTime: 1000 * 60 * 10,
  })

  // Step 3: at least 1 supplier
  const { data: suppliersData } = useQuery({
    queryKey: ['workflow-check', 'suppliers'],
    queryFn: () => suppliersAPI.list({ limit: 1 }),
    staleTime: 1000 * 60 * 10,
  })

  // Step 4: at least 1 contractor
  const { data: contractorsData } = useQuery({
    queryKey: ['workflow-check', 'contractors'],
    queryFn: () => contractorsAPI.list({ limit: 1 }),
    staleTime: 1000 * 60 * 10,
  })

  // Step 6: at least 1 project IN_PROGRESS
  const { data: inProgressData } = useQuery({
    queryKey: ['workflow-check', 'projects-in-progress'],
    queryFn: () => projectsAPI.list({ limit: 1, status: 'IN_PROGRESS' }),
    staleTime: 1000 * 60 * 10,
  })

  // Step 7: at least 1 financial transaction
  const { data: transactionsData } = useQuery({
    queryKey: ['workflow-check', 'transactions'],
    queryFn: () => financialAPI.listTransactions({ limit: 1 }),
    staleTime: 1000 * 60 * 10,
  })

  // Step 8: at least 1 completed project
  const { data: completedData } = useQuery({
    queryKey: ['workflow-check', 'projects-completed'],
    queryFn: () => projectsAPI.list({ limit: 1, status: 'COMPLETED' }),
    staleTime: 1000 * 60 * 10,
  })

  const hasProjects = (projectsData?.data?.length ?? 0) > 0
  const hasPurchases = (purchasesData?.data?.length ?? 0) > 0
  const hasSuppliers = (suppliersData?.data?.length ?? 0) > 0
  const hasContractors = (contractorsData?.data?.length ?? 0) > 0
  const hasInProgress = (inProgressData?.data?.length ?? 0) > 0
  const hasTransactions = (transactionsData?.data?.length ?? 0) > 0
  const hasCompleted = (completedData?.data?.length ?? 0) > 0

  const status: WorkflowStatus = {
    1: {
      fulfilled: hasProjects,
      label: hasProjects ? 'Projeto cadastrado' : 'Nenhum projeto cadastrado',
    },
    2: {
      fulfilled: hasPurchases,
      label: hasPurchases ? 'Pedido de compra criado' : 'Nenhum pedido de compra',
    },
    3: {
      fulfilled: hasSuppliers,
      label: hasSuppliers ? 'Fornecedor cadastrado' : 'Nenhum fornecedor cadastrado',
    },
    4: {
      fulfilled: hasContractors,
      label: hasContractors ? 'Empreiteiro cadastrado' : 'Nenhum empreiteiro cadastrado',
    },
    5: {
      fulfilled: hasSuppliers && hasContractors,
      label:
        hasSuppliers && hasContractors
          ? 'Documentação em dia'
          : 'Cadastre fornecedores e empreiteiros',
    },
    6: {
      fulfilled: hasInProgress,
      label: hasInProgress ? 'Obra em andamento' : 'Nenhuma obra em execução',
    },
    7: {
      fulfilled: hasTransactions,
      label: hasTransactions ? 'Transação registrada' : 'Nenhuma transação financeira',
    },
    8: {
      fulfilled: hasCompleted,
      label: hasCompleted ? 'Projeto concluído' : 'Nenhum projeto concluído',
    },
  }

  return status
}
