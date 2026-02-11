import { useAuthStore, Role } from '@/stores/auth.store'

// Permissions matrix mirroring backend
const ALL_PERMISSIONS = [
  'projects:view', 'projects:create', 'projects:edit', 'projects:delete',
  'units:view', 'units:create', 'units:edit', 'units:delete',
  'suppliers:view', 'suppliers:create', 'suppliers:edit', 'suppliers:delete',
  'contractors:view', 'contractors:create', 'contractors:edit', 'contractors:delete',
  'activities:view', 'activities:create', 'activities:edit', 'activities:delete',
  'measurements:view', 'measurements:create', 'measurements:approve',
  'brokers:view', 'brokers:create', 'brokers:edit', 'brokers:delete',
  'purchases:view', 'purchases:create', 'purchases:edit', 'purchases:delete', 'purchases:approve',
  'financial:view', 'financial:create', 'financial:edit', 'financial:delete', 'financial:reports',
  'contracts:view', 'contracts:create', 'contracts:edit', 'contracts:delete', 'contracts:sign',
  'users:view', 'users:create', 'users:edit', 'users:delete',
  'tenant:view', 'tenant:edit',
  'reports:view', 'reports:export',
]

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ROOT: ALL_PERMISSIONS,
  MASTER: ALL_PERMISSIONS,
  ENGINEER: [
    'projects:view', 'projects:create', 'projects:edit',
    'units:view', 'units:create', 'units:edit',
    'suppliers:view',
    'contractors:view', 'contractors:create', 'contractors:edit',
    'activities:view', 'activities:create', 'activities:edit', 'activities:delete',
    'measurements:view', 'measurements:create', 'measurements:approve',
    'purchases:view',
    'contracts:view', 'contracts:create', 'contracts:edit',
    'users:view',
    'tenant:view',
    'reports:view', 'reports:export',
  ],
  ADMIN_STAFF: [
    'projects:view',
    'units:view',
    'suppliers:view', 'suppliers:create', 'suppliers:edit', 'suppliers:delete',
    'contractors:view',
    'activities:view',
    'measurements:view',
    'brokers:view',
    'purchases:view', 'purchases:create', 'purchases:edit', 'purchases:delete', 'purchases:approve',
    'financial:view', 'financial:create', 'financial:edit', 'financial:delete', 'financial:reports',
    'contracts:view', 'contracts:create', 'contracts:edit',
    'users:view',
    'tenant:view',
    'reports:view', 'reports:export',
  ],
  CONTRACTOR: [
    'projects:view',
    'activities:view',
    'measurements:view', 'measurements:create',
    'contractors:view',
    'contracts:view',
  ],
  BROKER: [
    'projects:view',
    'units:view',
    'brokers:view',
    'contracts:view',
  ],
  VIEWER: [
    'projects:view',
    'units:view',
    'suppliers:view',
    'contractors:view',
    'activities:view',
    'measurements:view',
    'brokers:view',
    'purchases:view',
    'financial:view',
    'contracts:view',
    'tenant:view',
    'reports:view',
  ],
}

export function usePermission(permission: string): boolean {
  const user = useAuthStore((state) => state.user)
  if (!user) return false

  const permissions = user.permissions && user.permissions.length > 0
    ? user.permissions
    : ROLE_PERMISSIONS[user.role] || []

  return permissions.includes(permission)
}

export function useHasAnyPermission(permissions: string[]): boolean {
  const user = useAuthStore((state) => state.user)
  if (!user) return false

  const userPermissions = user.permissions && user.permissions.length > 0
    ? user.permissions
    : ROLE_PERMISSIONS[user.role] || []

  return permissions.some(p => userPermissions.includes(p))
}

export function useRole(): Role | null {
  const user = useAuthStore((state) => state.user)
  return user?.role ?? null
}
