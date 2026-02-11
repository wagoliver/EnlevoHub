import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Role = 'ROOT' | 'MASTER' | 'ENGINEER' | 'ADMIN_STAFF' | 'CONTRACTOR' | 'VIEWER'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  tenantId: string
  contractorId?: string | null
  isApproved?: boolean
  permissions?: string[]
}

export interface Tenant {
  id: string
  name: string
  plan: 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'
}

interface AuthState {
  // State
  user: User | null
  tenant: Tenant | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean

  // Actions
  setAuth: (data: {
    user: User
    tenant: Tenant
    tokens: { accessToken: string; refreshToken: string }
  }) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  setPermissions: (permissions: string[]) => void
  clearAuth: () => void
  updateUser: (user: Partial<User>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      tenant: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,

      // Set complete auth data (login/register)
      setAuth: ({ user, tenant, tokens }) =>
        set({
          user,
          tenant,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
        }),

      // Update tokens (refresh)
      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      // Set user permissions (loaded after login)
      setPermissions: (permissions) =>
        set((state) => ({
          user: state.user ? { ...state.user, permissions } : null,
        })),

      // Clear auth (logout)
      clearAuth: () =>
        set({
          user: null,
          tenant: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        }),

      // Update user data
      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'enlevohub-auth', // localStorage key
      partialize: (state) => ({
        // Only persist these fields
        user: state.user,
        tenant: state.tenant,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
