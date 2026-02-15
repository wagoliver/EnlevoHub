import { Navigate, useSearchParams } from 'react-router-dom'
import { usePermission, useRole } from '@/hooks/usePermission'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Mail, Database } from 'lucide-react'
import { EmailSettings } from './EmailSettings'
import { SinapiSettings } from './SinapiSettings'

export function SettingsPage() {
  const canEditTenant = usePermission('tenant:edit')
  const role = useRole()
  const canManageSinapi = role === 'ROOT' || role === 'MASTER'
  const [searchParams, setSearchParams] = useSearchParams()

  if (!canEditTenant) {
    return <Navigate to="/" replace />
  }

  const currentTab = searchParams.get('tab') || 'email'

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Configuracoes</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Gerencie as configuracoes do sistema
        </p>
      </div>

      <Tabs value={currentTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="email" className="gap-2">
            <Mail className="h-4 w-4" />
            Email / SMTP
          </TabsTrigger>
          {canManageSinapi && (
            <TabsTrigger value="sinapi" className="gap-2">
              <Database className="h-4 w-4" />
              Base SINAPI
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="email" className="mt-6">
          <EmailSettings />
        </TabsContent>

        {canManageSinapi && (
          <TabsContent value="sinapi" className="mt-6">
            <SinapiSettings />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
