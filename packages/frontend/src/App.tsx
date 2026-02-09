import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from './stores/auth.store'
import { PrivateRoute } from './components/auth/PrivateRoute'
import { MainLayout } from './components/layout/MainLayout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/projects/ProjectDetail'
import { Contractors } from './pages/Contractors'
import { ContractorDetail } from './pages/contractors/ContractorDetail'
import { ActivityTemplates } from './pages/settings/ActivityTemplates'
import { ActivityTemplateEditor } from './pages/settings/ActivityTemplateEditor'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="projects" element={<Projects />} />
            <Route path="projects/:id" element={<ProjectDetail />} />
            <Route path="units" element={<ComingSoon title="Unidades" />} />
            <Route path="suppliers" element={<ComingSoon title="Fornecedores" />} />
            <Route path="contractors" element={<Contractors />} />
            <Route path="contractors/:id" element={<ContractorDetail />} />
            <Route path="brokers" element={<ComingSoon title="Corretores" />} />
            <Route path="purchases" element={<ComingSoon title="Compras" />} />
            <Route path="financial" element={<ComingSoon title="Financeiro" />} />
            <Route path="contracts" element={<ComingSoon title="Contratos" />} />
            <Route path="reports" element={<ComingSoon title="Relatórios" />} />
            <Route path="profile" element={<ComingSoon title="Meu Perfil" />} />
            <Route path="settings" element={<ComingSoon title="Configurações" />} />
            <Route path="settings/templates" element={<ActivityTemplates />} />
            <Route path="settings/templates/:id" element={<ActivityTemplateEditor />} />
          </Route>

          {/* Catch all - redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </QueryClientProvider>
  )
}

// Public route wrapper - redirects to dashboard if already authenticated
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

// Coming soon placeholder
function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900">{title}</h1>
        <p className="mt-4 text-neutral-600">Esta funcionalidade será implementada em breve.</p>
        <p className="mt-2 text-sm text-neutral-500">Fase 3 em diante</p>
      </div>
    </div>
  )
}

export default App
