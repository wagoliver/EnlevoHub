import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useIsMobile } from '@/hooks/use-mobile'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function MainLayout() {
  const { isCollapsed } = useSidebarStore()
  const isMobile = useIsMobile()

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-neutral-50">
        <Sidebar />
        <div
          className={cn(
            'transition-all duration-300',
            isMobile ? 'ml-0' : isCollapsed ? 'ml-16' : 'ml-64'
          )}
        >
          <Header />
          <main className="p-4 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </TooltipProvider>
  )
}
