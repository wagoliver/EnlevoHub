import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { useAuthStore } from './stores/auth.store'
import { PrivateRoute } from './components/auth/PrivateRoute'
import { MainLayout } from './components/layout/MainLayout'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { EmailSettings } from './pages/settings/EmailSettings'
import { StorageSettings } from './pages/settings/StorageSettings'
import { Dashboard } from './pages/Dashboard'
import { Projects } from './pages/Projects'
import { ProjectDetail } from './pages/projects/ProjectDetail'
import { Contractors } from './pages/Contractors'
import { ContractorDetail } from './pages/contractors/ContractorDetail'
import { Brokers } from './pages/Brokers'
import { BrokerDetail } from './pages/brokers/BrokerDetail'
import { RegisterBroker } from './pages/RegisterBroker'
import { ActivityTemplates } from './pages/settings/ActivityTemplates'
import { ActivityTemplateEditor } from './pages/settings/ActivityTemplateEditor'
import { Users } from './pages/Users'
import { Profile } from './pages/Profile'
import { Financial } from './pages/Financial'
import { Units } from './pages/Units'
import { Performance } from './pages/Performance'
import { Suppliers } from './pages/Suppliers'
import { SupplierDetail } from './pages/suppliers/SupplierDetail'
import { PurchaseOrders } from './pages/PurchaseOrders'

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
          <Route path="/register-contractor" element={<Navigate to="/register" replace />} />
          <Route path="/register-broker" element={<RegisterBroker />} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pending-approval" element={<PendingApproval />} />

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
            <Route path="units" element={<Units />} />
            <Route path="suppliers" element={<Suppliers />} />
            <Route path="suppliers/:id" element={<SupplierDetail />} />
            <Route path="contractors" element={<Contractors />} />
            <Route path="contractors/:id" element={<ContractorDetail />} />
            <Route path="brokers" element={<Brokers />} />
            <Route path="brokers/:id" element={<BrokerDetail />} />
            <Route path="purchases" element={<PurchaseOrders />} />
            <Route path="financial" element={<Financial />} />
            <Route path="contracts" element={<ComingSoon title="Contratos" />} />
            <Route path="reports" element={<ComingSoon title="Relatórios" />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<EmailSettings />} />
            <Route path="settings/storage" element={<StorageSettings />} />
            <Route path="settings/planejamentos" element={<ActivityTemplates />} />
            <Route path="settings/planejamentos/:id" element={<ActivityTemplateEditor />} />
            <Route path="users" element={<Users />} />
            <Route path="performance" element={<Performance />} />
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

// Pending approval page
function PendingApproval() {
  const { user, clearAuth } = useAuthStore()

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/login'
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-md text-center">
        <div className="rounded-lg bg-white p-8 shadow-sm border border-neutral-200">
          <div className="mx-auto h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-amber-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-neutral-900">Aguardando Aprovação</h2>
          <p className="mt-3 text-neutral-600">
            Olá{user?.name ? `, ${user.name}` : ''}! Seu cadastro foi recebido e está aguardando aprovação da empresa.
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            Você receberá acesso assim que um administrador aprovar sua conta.
          </p>
          <button
            onClick={handleLogout}
            className="mt-6 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Sair e voltar ao login
          </button>
        </div>
      </div>
    </div>
  )
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
