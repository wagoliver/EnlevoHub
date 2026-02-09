import { useAuthStore } from '../stores/auth.store'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

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

    // Add authorization header if token exists
    if (accessToken && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${accessToken}`
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers,
    })

    // Handle 401 - try to refresh token
    if (response.status === 401) {
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
  getActivity: (projectId: string, activityId: string) =>
    apiClient.get<any>(`/projects/${projectId}/activities/${activityId}`),
  updateActivity: (projectId: string, activityId: string, data: any) =>
    apiClient.patch<any>(`/projects/${projectId}/activities/${activityId}`, data),
  deleteActivity: (projectId: string, activityId: string) =>
    apiClient.delete<any>(`/projects/${projectId}/activities/${activityId}`),
  getProgress: (projectId: string) =>
    apiClient.get<any>(`/projects/${projectId}/progress`),

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
  ignoreTransaction: (id: string) => apiClient.post<any>(`/financial/reconciliation/ignore/${id}`),
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
  previewSchedule: (id: string, config: {
    startDate: string
    endDate: string
    mode: 'BUSINESS_DAYS' | 'CALENDAR_DAYS'
    holidays?: string[]
  }) => apiClient.post<any>(`/activity-templates/${id}/preview-schedule`, config),
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
}
