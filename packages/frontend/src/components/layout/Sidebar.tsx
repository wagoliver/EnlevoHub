import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
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
  Settings,
  Gauge,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { EnlevoLogo } from '@/components/EnlevoLogo'
import { usePermission, useRole } from '@/hooks/usePermission'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useIsMobile } from '@/hooks/use-mobile'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  permission?: string
  role?: string
}

const mainNavigation: NavItem[] = [
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
]

const settingsNavigation: NavItem[] = [
  {
    title: 'Templates',
    href: '/settings/templates',
    icon: ListChecks,
    permission: 'activities:create',
  },
  {
    title: 'Usuários',
    href: '/users',
    icon: UsersRound,
    permission: 'users:view',
  },
  {
    title: 'Performance',
    href: '/performance',
    icon: Gauge,
    role: 'ROOT',
  },
]

function NavItemComponent({
  item,
  isCollapsed,
}: {
  item: NavItem
  isCollapsed: boolean
}) {
  const hasPermission = usePermission(item.permission || '')
  const userRole = useRole()

  if (item.role && userRole !== item.role) {
    return null
  }

  if (item.permission && !hasPermission) {
    return null
  }

  const link = (
    <NavLink
      to={item.href}
      className={({ isActive }) =>
        cn(
          'flex items-center rounded-lg text-sm font-medium transition-colors',
          isCollapsed
            ? 'justify-center px-2 py-2.5'
            : 'gap-3 px-3 py-2.5',
          isActive
            ? 'bg-white/10 text-[#b8a378] [&_svg]:text-[#b8a378]'
            : 'text-white/70 hover:bg-white/5 hover:text-white [&_svg]:text-white/70 [&_svg]:hover:text-white'
        )
      }
    >
      <item.icon className="h-5 w-5 shrink-0" />
      {!isCollapsed && item.title}
    </NavLink>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {item.title}
        </TooltipContent>
      </Tooltip>
    )
  }

  return link
}

function SettingsSection({ isCollapsed }: { isCollapsed: boolean }) {
  const canSeeTemplates = usePermission('activities:create')
  const canSeeUsers = usePermission('users:view')
  const isRoot = useRole() === 'ROOT'

  if (!canSeeTemplates && !canSeeUsers && !isRoot) {
    return null
  }

  return (
    <>
      {isCollapsed ? (
        <div className="my-3 mx-2 border-t border-white/10" />
      ) : (
        <div className="mt-4 mb-2 flex items-center gap-2 px-3">
          <Settings className="h-3.5 w-3.5 text-white/30" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">
            Configurações
          </span>
        </div>
      )}
      {settingsNavigation.map((item) => (
        <NavItemComponent
          key={item.href}
          item={item}
          isCollapsed={isCollapsed}
        />
      ))}
    </>
  )
}

function SidebarContent({ isCollapsed }: { isCollapsed: boolean }) {
  return (
    <div className="flex h-full flex-col bg-[#21252d]">
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-white/10',
          isCollapsed ? 'justify-center px-2' : 'px-6'
        )}
      >
        {isCollapsed ? (
          <span
            className="text-xl font-light text-white"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            E
          </span>
        ) : (
          <EnlevoLogo variant="light" size="sm" />
        )}
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          'flex flex-1 flex-col gap-1 overflow-y-auto p-4',
          isCollapsed && 'px-2'
        )}
      >
        {mainNavigation.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}
        <SettingsSection isCollapsed={isCollapsed} />
      </nav>

      {/* Footer */}
      <div className="border-t border-white/10 p-4">
        <div className="text-xs text-white/40 text-center">
          {isCollapsed ? (
            <p>v1.0</p>
          ) : (
            <>
              <p>EnlevoHub v1.0.0</p>
              <p className="mt-1">&copy; 2026 EnlevoHub</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export function Sidebar() {
  const isMobile = useIsMobile()
  const { isCollapsed, isMobileOpen, setMobileOpen } = useSidebarStore()
  const location = useLocation()

  // Auto-close mobile drawer on navigation
  useEffect(() => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }, [location.pathname, isMobile, setMobileOpen])

  if (isMobile) {
    return (
      <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          className="w-64 p-0 [&>button]:hidden"
        >
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <SidebarContent isCollapsed={false} />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <SidebarContent isCollapsed={isCollapsed} />
    </aside>
  )
}
