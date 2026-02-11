/**
 * Permission definitions for EnlevoHub
 * Format: resource:action
 */

export const Permissions = {
  // Projects
  PROJECTS_VIEW: 'projects:view',
  PROJECTS_CREATE: 'projects:create',
  PROJECTS_EDIT: 'projects:edit',
  PROJECTS_DELETE: 'projects:delete',

  // Units
  UNITS_VIEW: 'units:view',
  UNITS_CREATE: 'units:create',
  UNITS_EDIT: 'units:edit',
  UNITS_DELETE: 'units:delete',

  // Suppliers
  SUPPLIERS_VIEW: 'suppliers:view',
  SUPPLIERS_CREATE: 'suppliers:create',
  SUPPLIERS_EDIT: 'suppliers:edit',
  SUPPLIERS_DELETE: 'suppliers:delete',

  // Contractors
  CONTRACTORS_VIEW: 'contractors:view',
  CONTRACTORS_CREATE: 'contractors:create',
  CONTRACTORS_EDIT: 'contractors:edit',
  CONTRACTORS_DELETE: 'contractors:delete',

  // Activities
  ACTIVITIES_VIEW: 'activities:view',
  ACTIVITIES_CREATE: 'activities:create',
  ACTIVITIES_EDIT: 'activities:edit',
  ACTIVITIES_DELETE: 'activities:delete',

  // Measurements
  MEASUREMENTS_VIEW: 'measurements:view',
  MEASUREMENTS_CREATE: 'measurements:create',
  MEASUREMENTS_APPROVE: 'measurements:approve',

  // Brokers
  BROKERS_VIEW: 'brokers:view',
  BROKERS_CREATE: 'brokers:create',
  BROKERS_EDIT: 'brokers:edit',
  BROKERS_DELETE: 'brokers:delete',

  // Purchases
  PURCHASES_VIEW: 'purchases:view',
  PURCHASES_CREATE: 'purchases:create',
  PURCHASES_EDIT: 'purchases:edit',
  PURCHASES_DELETE: 'purchases:delete',
  PURCHASES_APPROVE: 'purchases:approve',

  // Financial
  FINANCIAL_VIEW: 'financial:view',
  FINANCIAL_CREATE: 'financial:create',
  FINANCIAL_EDIT: 'financial:edit',
  FINANCIAL_DELETE: 'financial:delete',
  FINANCIAL_REPORTS: 'financial:reports',

  // Contracts
  CONTRACTS_VIEW: 'contracts:view',
  CONTRACTS_CREATE: 'contracts:create',
  CONTRACTS_EDIT: 'contracts:edit',
  CONTRACTS_DELETE: 'contracts:delete',
  CONTRACTS_SIGN: 'contracts:sign',

  // Users
  USERS_VIEW: 'users:view',
  USERS_CREATE: 'users:create',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',

  // Tenant settings
  TENANT_VIEW: 'tenant:view',
  TENANT_EDIT: 'tenant:edit',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',
} as const

export type Permission = typeof Permissions[keyof typeof Permissions]

/**
 * Role definitions with their permissions
 *
 * ROOT = super admin - acesso total + telas de sistema (armazenamento, performance)
 * MASTER = admin do tenant - acesso total ao tenant (sem telas de sistema)
 * ENGINEER = gerencia obra, aprova medicoes (antigo MANAGER)
 * ADMIN_STAFF = financeiro, compras, fornecedores (sem aprovar medicoes)
 * CONTRACTOR = login proprio, ve apenas atividades atribuidas
 * VIEWER = somente leitura
 */
export const Roles = {
  ROOT: {
    name: 'ROOT',
    description: 'Super admin - acesso total ao sistema',
    permissions: Object.values(Permissions) as Permission[]
  },
  MASTER: {
    name: 'MASTER',
    description: 'Admin do tenant - acesso total ao tenant',
    permissions: Object.values(Permissions) as Permission[]
  },
  ENGINEER: {
    name: 'ENGINEER',
    description: 'Gerencia obra, aprova medições',
    permissions: [
      // Projects
      Permissions.PROJECTS_VIEW,
      Permissions.PROJECTS_CREATE,
      Permissions.PROJECTS_EDIT,

      // Units
      Permissions.UNITS_VIEW,
      Permissions.UNITS_CREATE,
      Permissions.UNITS_EDIT,

      // Suppliers (view only)
      Permissions.SUPPLIERS_VIEW,

      // Contractors
      Permissions.CONTRACTORS_VIEW,
      Permissions.CONTRACTORS_CREATE,
      Permissions.CONTRACTORS_EDIT,

      // Activities (full)
      Permissions.ACTIVITIES_VIEW,
      Permissions.ACTIVITIES_CREATE,
      Permissions.ACTIVITIES_EDIT,
      Permissions.ACTIVITIES_DELETE,

      // Measurements (create + approve)
      Permissions.MEASUREMENTS_VIEW,
      Permissions.MEASUREMENTS_CREATE,
      Permissions.MEASUREMENTS_APPROVE,

      // Purchases (view only)
      Permissions.PURCHASES_VIEW,

      // Contracts
      Permissions.CONTRACTS_VIEW,
      Permissions.CONTRACTS_CREATE,
      Permissions.CONTRACTS_EDIT,

      // Users (view only)
      Permissions.USERS_VIEW,

      // Tenant (view only)
      Permissions.TENANT_VIEW,

      // Reports
      Permissions.REPORTS_VIEW,
      Permissions.REPORTS_EXPORT,
    ] as Permission[]
  },
  ADMIN_STAFF: {
    name: 'ADMIN_STAFF',
    description: 'Financeiro, compras, fornecedores',
    permissions: [
      // Projects (view only)
      Permissions.PROJECTS_VIEW,

      // Units (view only)
      Permissions.UNITS_VIEW,

      // Suppliers (full)
      Permissions.SUPPLIERS_VIEW,
      Permissions.SUPPLIERS_CREATE,
      Permissions.SUPPLIERS_EDIT,
      Permissions.SUPPLIERS_DELETE,

      // Contractors (view only)
      Permissions.CONTRACTORS_VIEW,

      // Activities (view only)
      Permissions.ACTIVITIES_VIEW,

      // Measurements (view only)
      Permissions.MEASUREMENTS_VIEW,

      // Brokers (view only)
      Permissions.BROKERS_VIEW,

      // Purchases (full + approve)
      Permissions.PURCHASES_VIEW,
      Permissions.PURCHASES_CREATE,
      Permissions.PURCHASES_EDIT,
      Permissions.PURCHASES_DELETE,
      Permissions.PURCHASES_APPROVE,

      // Financial (full + reports)
      Permissions.FINANCIAL_VIEW,
      Permissions.FINANCIAL_CREATE,
      Permissions.FINANCIAL_EDIT,
      Permissions.FINANCIAL_DELETE,
      Permissions.FINANCIAL_REPORTS,

      // Contracts
      Permissions.CONTRACTS_VIEW,
      Permissions.CONTRACTS_CREATE,
      Permissions.CONTRACTS_EDIT,

      // Users (view only)
      Permissions.USERS_VIEW,

      // Tenant (view only)
      Permissions.TENANT_VIEW,

      // Reports
      Permissions.REPORTS_VIEW,
      Permissions.REPORTS_EXPORT,
    ] as Permission[]
  },
  CONTRACTOR: {
    name: 'CONTRACTOR',
    description: 'Empreiteiro - acesso restrito a atividades atribuídas',
    permissions: [
      // Projects (view - filtrado pelo backend ao escopo do empreiteiro)
      Permissions.PROJECTS_VIEW,

      // Units (view - para selecionar unidade ao registrar medição)
      Permissions.UNITS_VIEW,

      // Activities (view - filtrado ao escopo)
      Permissions.ACTIVITIES_VIEW,

      // Measurements (view + create - filtrado ao escopo)
      Permissions.MEASUREMENTS_VIEW,
      Permissions.MEASUREMENTS_CREATE,

      // Contractors (view - apenas proprio)
      Permissions.CONTRACTORS_VIEW,

      // Contracts (view - apenas proprios)
      Permissions.CONTRACTS_VIEW,
    ] as Permission[]
  },
  BROKER: {
    name: 'BROKER',
    description: 'Corretor - acesso restrito a unidades e vendas',
    permissions: [
      // Projects (view)
      Permissions.PROJECTS_VIEW,

      // Units (view - quadro de disponibilidade)
      Permissions.UNITS_VIEW,

      // Brokers (view - próprio perfil)
      Permissions.BROKERS_VIEW,

      // Contracts (view - futuros contratos)
      Permissions.CONTRACTS_VIEW,
    ] as Permission[]
  },
  VIEWER: {
    name: 'VIEWER',
    description: 'Somente leitura',
    permissions: [
      Permissions.PROJECTS_VIEW,
      Permissions.UNITS_VIEW,
      Permissions.SUPPLIERS_VIEW,
      Permissions.CONTRACTORS_VIEW,
      Permissions.ACTIVITIES_VIEW,
      Permissions.MEASUREMENTS_VIEW,
      Permissions.BROKERS_VIEW,
      Permissions.PURCHASES_VIEW,
      Permissions.FINANCIAL_VIEW,
      Permissions.CONTRACTS_VIEW,
      Permissions.TENANT_VIEW,
      Permissions.REPORTS_VIEW,
    ] as Permission[]
  }
} as const

export type Role = keyof typeof Roles

/**
 * Get permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return Roles[role]?.permissions || []
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = getRolePermissions(role)
  return permissions.includes(permission)
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission))
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission))
}
