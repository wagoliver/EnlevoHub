import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  LogOut,
  Settings,
  User,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
} from 'lucide-react'
import { useChatStore } from '@/stores/chat.store'
import { useAuthStore, Role } from '@/stores/auth.store'
import { usePermission } from '@/hooks/usePermission'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useIsMobile } from '@/hooks/use-mobile'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ROLE_LABELS: Record<Role, string> = {
  ROOT: 'Root',
  MASTER: 'Gestor',
  ENGINEER: 'Engenheiro',
  ADMIN_STAFF: 'Administrativo',
  CONTRACTOR: 'Empreiteiro',
  BROKER: 'Corretor',
  VIEWER: 'Visualizador',
}

const ROLE_COLORS: Record<Role, string> = {
  ROOT: 'bg-red-100 text-red-700',
  MASTER: 'bg-purple-100 text-purple-700',
  ENGINEER: 'bg-blue-100 text-blue-700',
  ADMIN_STAFF: 'bg-amber-100 text-amber-700',
  CONTRACTOR: 'bg-green-100 text-green-700',
  BROKER: 'bg-teal-100 text-teal-700',
  VIEWER: 'bg-neutral-100 text-neutral-700',
}

export function Header() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user, tenant, clearAuth } = useAuthStore()
  const { isCollapsed, toggleCollapsed, setMobileOpen } = useSidebarStore()
  const isMobile = useIsMobile()
  const canEditTenant = usePermission('tenant:edit')
  const { isOpen: isChatOpen, toggleOpen: toggleChat } = useChatStore()

  const handleLogout = () => {
    queryClient.clear()
    clearAuth()
    navigate('/login')
  }

  const getUserInitials = () => {
    if (!user) return 'U'
    const names = user.name.split(' ')
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase()
    }
    return user.name.substring(0, 2).toUpperCase()
  }

  const getRoleLabel = (role: string) => {
    return ROLE_LABELS[role as Role] || role
  }

  const getRoleBadgeColor = (role: string) => {
    return ROLE_COLORS[role as Role] || 'bg-neutral-100 text-neutral-700'
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
      <div className="flex h-16 items-center px-4 lg:px-6">
        {/* Mobile: Hamburger / Desktop: Collapse toggle */}
        {isMobile ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="mr-2"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menu</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleCollapsed}
            className="mr-2"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
            <span className="sr-only">
              {isCollapsed ? 'Expandir menu' : 'Recolher menu'}
            </span>
          </Button>
        )}

        {/* Tenant name */}
        {tenant && (
          <p className="text-sm text-neutral-500">{tenant.name}</p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* AI Assistant */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleChat}
          className={`mr-2 gap-2 transition-colors ${
            isChatOpen
              ? 'bg-[#b8a378]/10 text-[#b8a378]'
              : 'text-neutral-500 hover:text-[#b8a378]'
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline text-xs font-medium">Enlevo IA</span>
        </Button>

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-neutral-50 transition-colors">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-neutral-900">
                  {user.name}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {getRoleLabel(user.role)}
                  </span>
                </div>
              </div>
              <Avatar>
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div>
                  <p className="font-medium">{user.name}</p>
                  <p className="text-xs text-neutral-500 font-normal">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Meu Perfil
              </DropdownMenuItem>
              {canEditTenant && (
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-error-600 focus:text-error-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  )
}
