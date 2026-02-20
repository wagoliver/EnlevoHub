import { Outlet, useSearchParams, useNavigate } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useSidebarStore } from '@/stores/sidebar.store'
import { useIsMobile } from '@/hooks/use-mobile'
import { TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { ArrowLeft, LayoutDashboard } from 'lucide-react'
import { AIChatBubble } from '@/components/ai/AIChatBubble'

const PHASE_NAMES: Record<string, string> = {
  '1': 'Planejamento',
  '2': 'Levantamento',
  '3': 'Contratação',
  '4': 'Mobilização',
  '5': 'Documentação',
  '6': 'Execução',
  '7': 'Medição',
  '8': 'Encerramento',
}

export function MainLayout() {
  const { isCollapsed } = useSidebarStore()
  const isMobile = useIsMobile()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const phaseParam = searchParams.get('phase')
  const phaseName = phaseParam ? PHASE_NAMES[phaseParam] : null

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
          {phaseName && (
            <div className="sticky top-16 z-20 border-b border-[#b8a378]/20 bg-neutral-50 bg-gradient-to-r from-[#b8a378]/10 via-[#b8a378]/5 to-neutral-50">
              <div className="flex items-center gap-3 px-4 lg:px-8 py-2">
                <button
                  type="button"
                  onClick={() => navigate(`/?phase=${phaseParam}`)}
                  className="flex items-center gap-2 text-sm font-medium text-[#9a8a6a] hover:text-[#7a6a4a] transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Voltar ao Dashboard
                </button>
                <span className="text-neutral-300">|</span>
                <div className="flex items-center gap-1.5 text-sm text-neutral-500">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Fase {phaseParam}: {phaseName}
                </div>
              </div>
            </div>
          )}
          <main className="p-4 lg:p-8">
            <Outlet />
          </main>
        </div>
        <AIChatBubble />
      </div>
    </TooltipProvider>
  )
}
