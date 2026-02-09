import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, User } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function Header() {
  const navigate = useNavigate()
  const { user, tenant, clearAuth } = useAuthStore()

  const handleLogout = () => {
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

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-primary-100 text-primary-700'
      case 'MANAGER':
        return 'bg-accent-100 text-accent-700'
      case 'VIEWER':
        return 'bg-neutral-100 text-neutral-700'
      default:
        return 'bg-neutral-100 text-neutral-700'
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white">
      <div className="flex h-16 items-center px-6">
        {/* Tenant name */}
        {tenant && (
          <p className="text-sm text-neutral-500">{tenant.name}</p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-neutral-50 transition-colors">
              <div className="text-right">
                <p className="text-sm font-medium text-neutral-900">
                  {user.name}
                </p>
                <div className="flex items-center justify-end gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {user.role}
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
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </DropdownMenuItem>
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
