import { useAuthStore } from '../stores/auth.store'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

class APIClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  /**
   * Make HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const { accessToken } = useAuthStore.getState()

    const headers: Record<string, string> = {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers as Record<string, string>),
    }

    // Add authorization header if token exists (skip for public auth routes)
    const isPublicAuth = endpoint.startsWith('/auth/login')
      || endpoint.startsWith('/auth/register')
      || endpoint.startsWith('/auth/forgot-password')
      || endpoint.startsWith('/auth/reset-password')
      || endpoint.startsWith('/auth/refresh')
    if (accessToken && !headers['Authorization'] && !isPublicAuth) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    })

    // Handle 401 - try to refresh token (but not for public auth routes)
    if (response.status === 401 && !isPublicAuth) {
      const refreshed = await this.tryRefreshToken()
      if (refreshed) {
        // Retry original request with new token
        const { accessToken: newToken } = useAuthStore.getState()
        headers['Authorization'] = `Bearer ${newToken}`

        const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
          ...options,
          headers,
        })

        if (!retryResponse.ok) {
          throw new Error(await this.getErrorMessage(retryResponse))
        }

        return retryResponse.json()
      } else {
        // Refresh failed, logout user
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        throw new Error('Session expired')
      }
    }

    if (!response.ok) {
      const error = await this.getErrorMessage(response)
      throw new Error(error)
    }

    return response.json()
  }

  /**
   * Extract error message from response
   */
  private async getErrorMessage(response: Response): Promise<string> {
    try {
      const data = await response.json()
      return data.message || data.error || 'An error occurred'
    } catch {
      return response.statusText || 'An error occurred'
    }
  }

  /**
   * Try to refresh access token
   */
  private async tryRefreshToken(): Promise<boolean> {
    try {
      const { refreshToken } = useAuthStore.getState()

      if (!refreshToken) {
        return false
      }

      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      useAuthStore.getState().setTokens(data.accessToken, data.refreshToken)

      return true
    } catch {
      return false
    }
  }

  // HTTP methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data ?? {}),
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const { accessToken } = useAuthStore.getState()

    const headers: Record<string, string> = {}
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }
    // Do NOT set Content-Type - browser sets it with boundary for FormData

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers,
      body: formData,
    })

    if (response.status === 401) {
      const refreshed = await this.tryRefreshToken()
      if (refreshed) {
        const { accessToken: newToken } = useAuthStore.getState()
        headers['Authorization'] = `Bearer ${newToken}`
        const retryResponse = await fetch(`${this.baseURL}${endpoint}`, {
          method: 'POST',
          headers,
          body: formData,
        })
        if (!retryResponse.ok) {
          throw new Error(await this.getErrorMessage(retryResponse))
        }
        return retryResponse.json()
      } else {
        useAuthStore.getState().clearAuth()
        window.location.href = '/login'
        throw new Error('Session expired')
      }
    }

    if (!response.ok) {
      const error = await this.getErrorMessage(response)
      throw new Error(error)
    }

    return response.json()
  }
}

// Export singleton instance
export const apiClient = new APIClient(API_BASE_URL)

// Export API methods for specific endpoints
export const authAPI = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),

  register: (data: {
    email: string
    password: string
    name: string
    tenantName: string
    tenantDocument: string
  }) => apiClient.post('/auth/register', data),

  registerContractor: (data: {
    email: string
    password: string
    name: string
    tenantDocument: string
    document: string
    specialty: string[]
    contacts: any
  }) => apiClient.post('/auth/register-contractor', data),

  registerBroker: (data: {
    email: string
    password: string
    name: string
    tenantDocument: string
    document: string
    creci?: string
    phone?: string
  }) => apiClient.post('/auth/register-broker', data),

  getMe: () => apiClient.get('/auth/me'),

  updateProfile: (data: { name?: string; email?: string }) =>
    apiClient.patch('/auth/profile', data),

  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { currentPassword, newPassword }),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }),
}

export const tenantAPI = {
  getTenant: () => apiClient.get('/tenant'),
  getSettings: () => apiClient.get('/tenant/settings'),
  updateSettings: (settings: any) => apiClient.patch('/tenant/settings', settings),
  getStatistics: () => apiClient.get('/tenant/statistics'),
  getUsers: () => apiClient.get('/tenant/users'),
  sendTestEmail: (to: string) => apiClient.post('/tenant/settings/test-email', { to }),
  getDrives: () => apiClient.get<any>('/tenant/settings/drives'),
  testStoragePath: (path: string) => apiClient.post<any>('/tenant/settings/storage-test', { path }),
  getStorageConfig: () => apiClient.get<any>('/tenant/settings/storage-config'),
  saveStorageConfig: (storagePath: string) => apiClient.put<any>('/tenant/settings/storage-config', { storagePath }),
}

export const rbacAPI = {
  getRoles: () => apiClient.get('/rbac/roles'),
  getPermissions: () => apiClient.get('/rbac/permissions'),
  getMyPermissions: () => apiClient.get('/rbac/my-permissions'),
  checkPermission: (permission: string) =>
    apiClient.post('/rbac/check-permission', { permission }),
}

export const projectsAPI = {
  // Projects
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    sortBy?: string
    sortOrder?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/projects${qs ? `?${qs}` : ''}`)
  },
  create: (data: any) => apiClient.post<any>('/projects', data),
  getById: (id: string) => apiClient.get<any>(`/projects/${id}`),
  update: (id: string, data: any) => apiClient.patch<any>(`/projects/${id}`, data),
  delete: (id: string) => apiClient.delete<any>(`/projects/${id}`),
  getStatistics: (id: string) => apiClient.get<any>(`/projects/${id}/statistics`),
  getDashboardStats: () => apiClient.get<any>('/projects/dashboard/stats'),

  // Evolutions (legacy)
  listEvolutions: (projectId: string) =>
    apiClient.get<any>(`/projects/${projectId}/evolutions`),
  createEvolution: (projectId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/evolutions`, data),
  updateEvolution: (projectId: string, evolutionId: string, data: any) =>
    apiClient.patch<any>(`/projects/${projectId}/evolutions/${evolutionId}`, data),
  deleteEvolution: (projectId: string, evolutionId: string) =>
    apiClient.delete<any>(`/projects/${projectId}/evolutions/${evolutionId}`),

  // Activities
  listActivities: (projectId: string) =>
    apiClient.get<any>(`/projects/${projectId}/activities`),
  createActivity: (projectId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/activities`, data),
  createActivitiesFromTemplate: (projectId: string, templateId: string) =>
    apiClient.post<any>(`/projects/${projectId}/activities/from-template`, { templateId }),
  createActivitiesFromTemplateWithSchedule: (projectId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/activities/from-template`, data),
  createActivitiesFromHierarchy: (projectId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/activities/from-hierarchy`, data),
  getActivity: (projectId: string, activityId: string) =>
    apiClient.get<any>(`/projects/${projectId}/activities/${activityId}`),
  updateActivity: (projectId: string, activityId: string, data: any) =>
    apiClient.patch<any>(`/projects/${projectId}/activities/${activityId}`, data),
  deleteActivity: (projectId: string, activityId: string) =>
    apiClient.delete<any>(`/projects/${projectId}/activities/${activityId}`),
  getProgress: (projectId: string) =>
    apiClient.get<any>(`/projects/${projectId}/progress`),
  getReviewSummary: (projectId: string) =>
    apiClient.get<any>(`/projects/${projectId}/activities/review-summary`),

  // Measurements
  listMeasurements: (projectId: string, params?: {
    page?: number
    limit?: number
    status?: string
    activityId?: string
    contractorId?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/projects/${projectId}/measurements${qs ? `?${qs}` : ''}`)
  },
  createMeasurement: (projectId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/measurements`, data),
  createBatchMeasurements: (projectId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/measurements/batch`, data),
  getMeasurement: (projectId: string, measurementId: string) =>
    apiClient.get<any>(`/projects/${projectId}/measurements/${measurementId}`),
  reviewMeasurement: (projectId: string, measurementId: string, data: any) =>
    apiClient.patch<any>(`/projects/${projectId}/measurements/${measurementId}/review`, data),
  uploadMeasurementPhotos: (projectId: string, formData: FormData) =>
    apiClient.upload<{ urls: string[] }>(`/projects/${projectId}/measurements/upload`, formData),

  // Units
  listUnits: (projectId: string, params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    type?: string
    blockId?: string
    floorPlanId?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/projects/${projectId}/units${qs ? `?${qs}` : ''}`)
  },
  createUnit: (projectId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/units`, data),
  updateUnit: (projectId: string, unitId: string, data: any) =>
    apiClient.patch<any>(`/projects/${projectId}/units/${unitId}`, data),
  deleteUnit: (projectId: string, unitId: string) =>
    apiClient.delete<any>(`/projects/${projectId}/units/${unitId}`),
  previewGenerate: (projectId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/units/preview-generate`, data),
  bulkGenerate: (projectId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/units/bulk-generate`, data),
  bulkDeleteUnits: (projectId: string, unitIds: string[]) =>
    apiClient.post<any>(`/projects/${projectId}/units/bulk-delete`, { unitIds }),

  // Floor Plans
  listFloorPlans: (projectId: string) =>
    apiClient.get<any>(`/projects/${projectId}/floor-plans`),
  createFloorPlan: (projectId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/floor-plans`, data),
  updateFloorPlan: (projectId: string, fpId: string, data: any) =>
    apiClient.patch<any>(`/projects/${projectId}/floor-plans/${fpId}`, data),
  deleteFloorPlan: (projectId: string, fpId: string) =>
    apiClient.delete<any>(`/projects/${projectId}/floor-plans/${fpId}`),

  // Blocks
  listBlocks: (projectId: string) =>
    apiClient.get<any>(`/projects/${projectId}/blocks`),
  createBlock: (projectId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/blocks`, data),
  updateBlock: (projectId: string, blockId: string, data: any) =>
    apiClient.patch<any>(`/projects/${projectId}/blocks/${blockId}`, data),
  deleteBlock: (projectId: string, blockId: string) =>
    apiClient.delete<any>(`/projects/${projectId}/blocks/${blockId}`),

  // Upload (legacy)
  uploadPhotos: (projectId: string, formData: FormData) =>
    apiClient.upload<{ urls: string[] }>(`/projects/${projectId}/evolutions/upload`, formData),
}

export const contractorsAPI = {
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    specialty?: string
    isActive?: boolean
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/contractors${qs ? `?${qs}` : ''}`)
  },
  getById: (id: string) => apiClient.get<any>(`/contractors/${id}`),
  create: (data: any) => apiClient.post<any>('/contractors', data),
  update: (id: string, data: any) => apiClient.patch<any>(`/contractors/${id}`, data),
  delete: (id: string) => apiClient.delete<any>(`/contractors/${id}`),
  assignToProject: (contractorId: string, projectId: string, data: any) =>
    apiClient.post<any>(`/contractors/${contractorId}/projects/${projectId}`, data),
  unassignFromProject: (contractorId: string, projectId: string) =>
    apiClient.delete<any>(`/contractors/${contractorId}/projects/${projectId}`),
  listByProject: (projectId: string) =>
    apiClient.get<any>(`/contractors/project/${projectId}`),

  // Contractor Activities
  syncActivities: (contractorId: string, projectId: string, activityIds: string[]) =>
    apiClient.post<any>(`/contractors/${contractorId}/projects/${projectId}/activities`, { activityIds }),
  unassignActivity: (contractorId: string, activityId: string) =>
    apiClient.delete<any>(`/contractors/${contractorId}/activities/${activityId}`),
  listActivitiesByProject: (contractorId: string, projectId: string) =>
    apiClient.get<any>(`/contractors/${contractorId}/projects/${projectId}/activities`),

  // Contractor Units
  syncUnits: (contractorId: string, projectId: string, unitIds: string[]) =>
    apiClient.post<any>(`/contractors/${contractorId}/projects/${projectId}/units`, { unitIds }),
  listUnitsByProject: (contractorId: string, projectId: string) =>
    apiClient.get<any>(`/contractors/${contractorId}/projects/${projectId}/units`),
}

export const brokersAPI = {
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    isActive?: boolean
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/brokers${qs ? `?${qs}` : ''}`)
  },
  getById: (id: string) => apiClient.get<any>(`/brokers/${id}`),
  create: (data: any) => apiClient.post<any>('/brokers', data),
  update: (id: string, data: any) => apiClient.patch<any>(`/brokers/${id}`, data),
  delete: (id: string) => apiClient.delete<any>(`/brokers/${id}`),
}

export const usersAPI = {
  list: () => apiClient.get<any>('/users'),
  create: (data: {
    email: string
    password: string
    name: string
    role: string
  }) => apiClient.post<any>('/users', data),
  update: (id: string, data: any) => apiClient.patch<any>(`/users/${id}`, data),
  approve: (id: string) => apiClient.post<any>(`/users/${id}/approve`),
  reject: (id: string) => apiClient.post<any>(`/users/${id}/reject`),
}

export const financialAPI = {
  // Dashboard
  getDashboard: () => apiClient.get<any>('/financial/dashboard'),

  // Accounts
  listAccounts: () => apiClient.get<any>('/financial/accounts'),
  createAccount: (data: any) => apiClient.post<any>('/financial/accounts', data),
  updateAccount: (id: string, data: any) => apiClient.patch<any>(`/financial/accounts/${id}`, data),
  deleteAccount: (id: string) => apiClient.delete<any>(`/financial/accounts/${id}`),

  // Transactions
  listTransactions: (params?: {
    page?: number
    limit?: number
    search?: string
    type?: string
    category?: string
    status?: string
    bankAccountId?: string
    projectId?: string
    reconciliationStatus?: string
    dateFrom?: string
    dateTo?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/financial/transactions${qs ? `?${qs}` : ''}`)
  },
  createTransaction: (data: any) => apiClient.post<any>('/financial/transactions', data),
  updateTransaction: (id: string, data: any) => apiClient.patch<any>(`/financial/transactions/${id}`, data),
  deleteTransaction: (id: string) => apiClient.delete<any>(`/financial/transactions/${id}`),

  // Import
  importFile: (bankAccountId: string, formData: FormData) =>
    apiClient.upload<any>(`/financial/import?bankAccountId=${bankAccountId}`, formData),
  listImports: () => apiClient.get<any>('/financial/imports'),
  deleteImportBatch: (id: string) => apiClient.delete<any>(`/financial/imports/${id}`),

  // Reconciliation
  getPendingReconciliation: (filter?: string) => apiClient.get<any>(`/financial/reconciliation/pending${filter ? `?filter=${filter}` : ''}`),
  getSuggestions: (id: string) => apiClient.get<any>(`/financial/reconciliation/suggestions/${id}`),
  matchTransaction: (data: { transactionId: string; linkedEntityType: string; linkedEntityId: string; linkedEntityName: string }) =>
    apiClient.post<any>('/financial/reconciliation/match', data),
  unlinkTransaction: (id: string) => apiClient.post<any>(`/financial/reconciliation/unlink/${id}`),
  ignoreTransaction: (id: string) => apiClient.post<any>(`/financial/reconciliation/ignore/${id}`),
  rerunReconciliation: () => apiClient.post<any>('/financial/reconciliation/rerun'),
  searchEntities: (search: string) => apiClient.get<any>(`/financial/reconciliation/search-entities?search=${encodeURIComponent(search)}`),
}

export const activityTemplatesAPI = {
  list: (params?: {
    page?: number
    limit?: number
    search?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/activity-templates${qs ? `?${qs}` : ''}`)
  },
  getById: (id: string) => apiClient.get<any>(`/activity-templates/${id}`),
  create: (data: any) => apiClient.post<any>('/activity-templates', data),
  update: (id: string, data: any) => apiClient.patch<any>(`/activity-templates/${id}`, data),
  delete: (id: string) => apiClient.delete<any>(`/activity-templates/${id}`),
  clone: (id: string, data: { name: string; description?: string }) =>
    apiClient.post<any>(`/activity-templates/${id}/clone`, data),
  previewSchedule: (id: string, config: {
    startDate: string
    endDate: string
    mode: 'BUSINESS_DAYS' | 'CALENDAR_DAYS'
    holidays?: string[]
  }) => apiClient.post<any>(`/activity-templates/${id}/preview-schedule`, config),
}

export const sinapiAPI = {
  getMesesReferencia: () => apiClient.get<string[]>('/sinapi/meses-referencia'),
  searchInsumos: (params?: { search?: string; tipo?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') searchParams.set(key, String(value))
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/sinapi/insumos${qs ? `?${qs}` : ''}`)
  },
  getInsumo: (id: string) => apiClient.get<any>(`/sinapi/insumos/${id}`),
  searchComposicoes: (params?: { search?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') searchParams.set(key, String(value))
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/sinapi/composicoes${qs ? `?${qs}` : ''}`)
  },
  getComposicao: (id: string) => apiClient.get<any>(`/sinapi/composicoes/${id}`),
  calculateComposicao: (id: string, params: { uf: string; mesReferencia: string; quantidade?: number; desonerado?: boolean }) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value))
    })
    return apiClient.get<any>(`/sinapi/composicoes/${id}/calculate?${searchParams.toString()}`)
  },
  getComposicaoTree: (id: string, params: { uf: string; mesReferencia: string; desonerado?: boolean }) => {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.set(key, String(value))
    })
    return apiClient.get<any>(`/sinapi/composicoes/${id}/tree?${searchParams.toString()}`)
  },
  batchResolve: (params: { codes: string[]; uf: string; mesReferencia: string; desonerado?: boolean }) => {
    const searchParams = new URLSearchParams()
    searchParams.set('codes', params.codes.join(','))
    searchParams.set('uf', params.uf)
    searchParams.set('mesReferencia', params.mesReferencia)
    if (params.desonerado !== undefined) searchParams.set('desonerado', String(params.desonerado))
    return apiClient.get<Record<string, { id: string; codigo: string; descricao: string; unidade: string; custoUnitarioTotal: number; itensSemPreco: number }>>(`/sinapi/composicoes/batch-resolve?${searchParams.toString()}`)
  },
  getStats: () => apiClient.get<{ insumos: number; composicoes: number; precos: number; meses: string[] }>('/sinapi/stats'),
  importInsumos: (formData: FormData) => apiClient.upload<any>('/sinapi/import/insumos', formData),
  importComposicoes: (formData: FormData) => apiClient.upload<any>('/sinapi/import/composicoes', formData),
  importPrecos: (formData: FormData) => apiClient.upload<any>('/sinapi/import/precos', formData),
  collect: (year: number, month: number, onProgress?: (msg: string) => void) => {
    return sseRequest('/sinapi/collect', { body: JSON.stringify({ year, month }), contentType: 'application/json' }, onProgress)
  },
  collectFromZip: (file: File, onProgress?: (msg: string) => void) => {
    const formData = new FormData()
    formData.append('file', file)
    return sseRequest('/sinapi/collect-from-zip', { body: formData }, onProgress)
  },
}

/** POST that reads SSE progress events and returns the final result */
async function sseRequest(
  endpoint: string,
  opts: { body: BodyInit; contentType?: string },
  onProgress?: (msg: string) => void,
): Promise<any> {
  const { accessToken } = useAuthStore.getState()
  const headers: Record<string, string> = {}
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`
  if (opts.contentType) headers['Content-Type'] = opts.contentType

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: opts.body,
  })

  if (!response.ok) {
    let msg = response.statusText
    try {
      const data = await response.json()
      msg = data.message || data.error || msg
    } catch { /* ignore */ }
    throw new Error(msg)
  }

  // If not SSE, fallback to JSON
  const ct = response.headers.get('content-type') || ''
  if (!ct.includes('text/event-stream')) {
    return response.json()
  }

  // Parse SSE stream
  const reader = response.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let result: any = null

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''

    for (const part of parts) {
      if (!part.trim()) continue
      let eventType = ''
      let eventData = ''
      for (const line of part.split('\n')) {
        if (line.startsWith('event: ')) eventType = line.slice(7)
        else if (line.startsWith('data: ')) eventData = line.slice(6)
      }

      if (eventType === 'progress' && onProgress) {
        try {
          const parsed = JSON.parse(eventData)
          onProgress(parsed.message)
        } catch { /* ignore */ }
      } else if (eventType === 'done') {
        result = JSON.parse(eventData)
      } else if (eventType === 'error') {
        const parsed = JSON.parse(eventData)
        throw new Error(parsed.message)
      }
    }
  }

  return result
}

export const levantamentoAPI = {
  getItemCount: () =>
    apiClient.get<{ count: number }>('/projects/levantamento-item-count'),
  list: (projectId: string, params?: { page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.set(key, String(value))
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/projects/${projectId}/levantamentos${qs ? `?${qs}` : ''}`)
  },
  getById: (projectId: string, id: string) =>
    apiClient.get<any>(`/projects/${projectId}/levantamentos/${id}`),
  getForFloorPlan: (projectId: string, floorPlanId: string) =>
    apiClient.get<any>(`/projects/${projectId}/floor-plans/${floorPlanId}/levantamento`),
  getForProject: (projectId: string) =>
    apiClient.get<any>(`/projects/${projectId}/levantamento`),
  create: (projectId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/levantamentos`, data),
  update: (projectId: string, id: string, data: any) =>
    apiClient.patch<any>(`/projects/${projectId}/levantamentos/${id}`, data),
  delete: (projectId: string, id: string) =>
    apiClient.delete<any>(`/projects/${projectId}/levantamentos/${id}`),
  // Ambientes
  listAmbientes: (projectId: string, levantamentoId: string) =>
    apiClient.get<any>(`/projects/${projectId}/levantamentos/${levantamentoId}/ambientes`),
  createAmbiente: (projectId: string, levantamentoId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/levantamentos/${levantamentoId}/ambientes`, data),
  updateAmbiente: (projectId: string, levantamentoId: string, ambienteId: string, data: any) =>
    apiClient.patch<any>(`/projects/${projectId}/levantamentos/${levantamentoId}/ambientes/${ambienteId}`, data),
  deleteAmbiente: (projectId: string, levantamentoId: string, ambienteId: string) =>
    apiClient.delete<any>(`/projects/${projectId}/levantamentos/${levantamentoId}/ambientes/${ambienteId}`),

  // Items
  addItem: (projectId: string, levantamentoId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/levantamentos/${levantamentoId}/itens`, data),
  batchCreateItems: (projectId: string, levantamentoId: string, itens: any[]) =>
    apiClient.post<any>(`/projects/${projectId}/levantamentos/${levantamentoId}/itens/batch`, { itens }),
  updateItem: (projectId: string, levantamentoId: string, itemId: string, data: any) =>
    apiClient.patch<any>(`/projects/${projectId}/levantamentos/${levantamentoId}/itens/${itemId}`, data),
  deleteItem: (projectId: string, levantamentoId: string, itemId: string) =>
    apiClient.delete<any>(`/projects/${projectId}/levantamentos/${levantamentoId}/itens/${itemId}`),
  addFromComposicao: (projectId: string, levantamentoId: string, data: any) =>
    apiClient.post<any>(`/projects/${projectId}/levantamentos/${levantamentoId}/from-composicao`, data),
  getResumo: (projectId: string, levantamentoId: string) =>
    apiClient.get<any>(`/projects/${projectId}/levantamentos/${levantamentoId}/resumo`),

  // Activity-Service Links
  autoLinkActivities: (projectId: string) =>
    apiClient.post<any>(`/projects/${projectId}/activity-service-links/auto`),
  getTemplatesByActivity: (projectId: string) =>
    apiClient.get<any>(`/projects/${projectId}/templates-by-activity`),
  linkActivity: (projectId: string, data: { projectActivityId: string; servicoTemplateId: string }) =>
    apiClient.post<any>(`/projects/${projectId}/activity-service-links`, data),
  unlinkActivity: (projectId: string, linkId: string) =>
    apiClient.delete<any>(`/projects/${projectId}/activity-service-links/${linkId}`),
  propagateSinapi: (projectId: string) =>
    apiClient.post<any>(`/projects/${projectId}/propagate-sinapi`),

  // Servico Templates
  listTemplates: () =>
    apiClient.get<any[]>('/projects/servico-templates'),
  createTemplate: (data: any) =>
    apiClient.post<any>('/projects/servico-templates', data),
  updateTemplate: (id: string, data: any) =>
    apiClient.patch<any>(`/projects/servico-templates/${id}`, data),
  deleteTemplate: (id: string) =>
    apiClient.delete<any>(`/projects/servico-templates/${id}`),
  resetTemplates: () =>
    apiClient.post<any>('/projects/servico-templates/reset', {}),
  getStageSuggestions: () =>
    apiClient.get<string[]>('/projects/servico-templates/stage-suggestions'),

  // Ambiente Tags
  listTags: () =>
    apiClient.get<any[]>('/projects/ambiente-tags'),
  createTag: (data: any) =>
    apiClient.post<any>('/projects/ambiente-tags', data),
  updateTag: (id: string, data: any) =>
    apiClient.patch<any>(`/projects/ambiente-tags/${id}`, data),
  deleteTag: (id: string) =>
    apiClient.delete<any>(`/projects/ambiente-tags/${id}`),
}

export const monitoringAPI = {
  getOverview: () => apiClient.get<any>('/monitoring/overview'),
  getSystem: () => apiClient.get<any>('/monitoring/system'),
  getHttp: () => apiClient.get<any>('/monitoring/http'),
  getHttpTimeseries: (minutes = 60) => apiClient.get<any>(`/monitoring/http/timeseries?minutes=${minutes}`),
  getDatabase: () => apiClient.get<any>('/monitoring/database'),
  getApplication: () => apiClient.get<any>('/monitoring/application'),
  getTenants: () => apiClient.get<any>('/monitoring/tenants'),
  getAudit: (days = 7) => apiClient.get<any>(`/monitoring/audit?days=${days}`),
  getStorage: () => apiClient.get<any>('/monitoring/storage'),
}

export const suppliersAPI = {
  // Suppliers
  list: (params?: {
    page?: number
    limit?: number
    search?: string
    type?: string
    isActive?: boolean
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/suppliers${qs ? `?${qs}` : ''}`)
  },
  getById: (id: string) => apiClient.get<any>(`/suppliers/${id}`),
  create: (data: any) => apiClient.post<any>('/suppliers', data),
  update: (id: string, data: any) => apiClient.patch<any>(`/suppliers/${id}`, data),
  delete: (id: string) => apiClient.delete<any>(`/suppliers/${id}`),
  getFinancialSummary: (id: string) => apiClient.get<any>(`/suppliers/${id}/financial-summary`),

  // Supplier Materials
  listSupplierMaterials: (supplierId: string) =>
    apiClient.get<any>(`/suppliers/${supplierId}/materials`),
  linkMaterial: (supplierId: string, data: { materialId: string; price: number }) =>
    apiClient.post<any>(`/suppliers/${supplierId}/materials`, data),
  unlinkMaterial: (supplierId: string, materialId: string) =>
    apiClient.delete<any>(`/suppliers/${supplierId}/materials/${materialId}`),

  // Materials catalog
  listMaterials: (params?: {
    page?: number
    limit?: number
    search?: string
    category?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/suppliers/materials${qs ? `?${qs}` : ''}`)
  },
  getMaterial: (id: string) => apiClient.get<any>(`/suppliers/materials/${id}`),
  createMaterial: (data: any) => apiClient.post<any>('/suppliers/materials', data),
  updateMaterial: (id: string, data: any) => apiClient.patch<any>(`/suppliers/materials/${id}`, data),
  deleteMaterial: (id: string) => apiClient.delete<any>(`/suppliers/materials/${id}`),
  getMaterialSuppliers: (materialId: string) =>
    apiClient.get<any>(`/suppliers/materials/${materialId}/suppliers`),

  // Purchase Orders
  listPurchaseOrders: (params?: {
    page?: number
    limit?: number
    search?: string
    status?: string
    projectId?: string
    supplierId?: string
  }) => {
    const searchParams = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          searchParams.set(key, String(value))
        }
      })
    }
    const qs = searchParams.toString()
    return apiClient.get<any>(`/suppliers/purchase-orders${qs ? `?${qs}` : ''}`)
  },
  getPurchaseOrder: (id: string) => apiClient.get<any>(`/suppliers/purchase-orders/${id}`),
  createPurchaseOrder: (data: any) => apiClient.post<any>('/suppliers/purchase-orders', data),
  updatePurchaseOrderStatus: (id: string, data: { status: string; createExpense?: boolean; bankAccountId?: string }) =>
    apiClient.patch<any>(`/suppliers/purchase-orders/${id}/status`, data),
  deletePurchaseOrder: (id: string) => apiClient.delete<any>(`/suppliers/purchase-orders/${id}`),
}
