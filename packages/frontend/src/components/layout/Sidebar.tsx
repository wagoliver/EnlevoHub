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
  HardDrive,
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
    title: 'Planejamentos',
    href: '/settings/planejamentos',
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
    title: 'Armazenamento',
    href: '/settings/storage',
    icon: HardDrive,
    role: 'ROOT',
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
          'flex items-center h-9 rounded-md text-sm font-medium transition-colors',
          isActive
            ? 'sidebar-item-active text-[#b8a378] [&_svg]:text-[#b8a378]'
            : 'text-white/70 hover:bg-white/5 hover:text-white [&_svg]:text-white/70 [&_svg]:hover:text-white'
        )
      }
    >
      <div className="w-12 flex items-center justify-center shrink-0">
        <item.icon className="h-[18px] w-[18px] shrink-0" />
      </div>
      {!isCollapsed && (
        <span className="animate-in fade-in-50 duration-200">
          {item.title}
        </span>
      )}
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
        <div className="my-3 mx-2 flex items-center">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/[0.12] to-transparent" />
        </div>
      ) : (
        <div className="mt-4 mb-2 flex items-center gap-3 px-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/[0.08]" />
          <div className="flex items-center gap-1.5">
            <Settings className="h-3 w-3 text-white/30" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-white/30">
              Configurações
            </span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/[0.08]" />
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
    <div className="flex h-full flex-col sidebar-texture">
      {/* Logo */}
      <div
        className={cn(
          'flex h-16 items-center',
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

      {/* Gradient border under logo */}
      <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 py-3 sidebar-scroll">
        {mainNavigation.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            isCollapsed={isCollapsed}
          />
        ))}
        <SettingsSection isCollapsed={isCollapsed} />
      </nav>
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
        'fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-300 shadow-[4px_0_24px_rgba(0,0,0,0.15)]',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <SidebarContent isCollapsed={isCollapsed} />
    </aside>
  )
}
