import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  Home,
  Users,
  HardHat,
  UserCheck,
  ShoppingCart,
  DollarSign,
  FileText,
  BarChart3,
  ListChecks,
  UsersRound,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EnlevoLogo } from '@/components/EnlevoLogo'
import { usePermission } from '@/hooks/usePermission'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  permission?: string
}

const navigation: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    title: 'Projetos',
    href: '/projects',
    icon: FolderKanban,
    permission: 'projects:view',
  },
  {
    title: 'Unidades',
    href: '/units',
    icon: Home,
    permission: 'units:view',
  },
  {
    title: 'Fornecedores',
    href: '/suppliers',
    icon: Users,
    permission: 'suppliers:view',
  },
  {
    title: 'Empreiteiros',
    href: '/contractors',
    icon: HardHat,
    permission: 'contractors:view',
  },
  {
    title: 'Corretores',
    href: '/brokers',
    icon: UserCheck,
    permission: 'brokers:view',
  },
  {
    title: 'Compras',
    href: '/purchases',
    icon: ShoppingCart,
    permission: 'purchases:view',
  },
  {
    title: 'Financeiro',
    href: '/financial',
    icon: DollarSign,
    permission: 'financial:view',
  },
  {
    title: 'Contratos',
    href: '/contracts',
    icon: FileText,
    permission: 'contracts:view',
  },
  {
    title: 'Relatórios',
    href: '/reports',
    icon: BarChart3,
    permission: 'reports:view',
  },
  {
    title: 'Templates',
    href: '/settings/templates',
    icon: ListChecks,
    permission: 'activities:create',
  },
  {
    title: 'Email',
    href: '/settings/email',
    icon: Mail,
    permission: 'tenant:edit',
  },
  {
    title: 'Usuários',
    href: '/users',
    icon: UsersRound,
    permission: 'users:view',
  },
]

function NavItemComponent({ item }: { item: NavItem }) {
  const hasPermission = usePermission(item.permission || '')

  // Always show items without permission requirement (Dashboard)
  // Filter by permission for other items
  if (item.permission && !hasPermission) {
    return null
  }

  return (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-white/10 text-[#b8a378]'
            : 'text-white/70 hover:bg-white/5 hover:text-white'
        )
      }
    >
      <item.icon className="h-5 w-5" />
      {item.title}
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col bg-[#21252d]">
      {/* Logo */}
      <div className="flex h-16 items-center px-6 border-b border-white/10">
        <EnlevoLogo variant="light" size="sm" />
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {navigation.map((item) => (
          <NavItemComponent key={item.href} item={item} />
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <div className="text-xs text-white/40 text-center">
          <p>EnlevoHub v1.0.0</p>
          <p className="mt-1">&copy; 2026 EnlevoHub</p>
        </div>
      </div>
    </aside>
  )
}
