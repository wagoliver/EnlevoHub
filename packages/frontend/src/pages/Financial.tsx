import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { financialAPI } from '@/lib/api-client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react'
import { TransactionList } from './financial/TransactionList'
import { BankAccountList } from './financial/BankAccountList'
import { ReconciliationView } from './financial/ReconciliationView'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function DashboardCards() {
  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['financial', 'dashboard'],
    queryFn: () => financialAPI.getDashboard(),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  const d = dashboard as any
  if (!d) return null

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Saldo Total</CardTitle>
            <DollarSign className="h-4 w-4 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${d.totalBalance >= 0 ? 'text-neutral-900' : 'text-red-600'}`}>
              {formatCurrency(d.totalBalance)}
            </p>
            <p className="text-xs text-neutral-400 mt-1">
              {d.accounts?.length || 0} conta(s) ativa(s)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Receitas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(d.monthlyIncome)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">
              {formatCurrency(d.monthlyExpense)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">A Conciliar</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{d.pendingReconciliation}</p>
            <p className="text-xs text-neutral-400 mt-1">transações pendentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Balance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Balanço do Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-neutral-500">Receitas</span>
                <span className="text-sm font-medium text-green-600">{formatCurrency(d.monthlyIncome)}</span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{
                    width: d.monthlyIncome + d.monthlyExpense > 0
                      ? `${(d.monthlyIncome / (d.monthlyIncome + d.monthlyExpense)) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-neutral-500">Despesas</span>
                <span className="text-sm font-medium text-red-600">{formatCurrency(d.monthlyExpense)}</span>
              </div>
              <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-red-500"
                  style={{
                    width: d.monthlyIncome + d.monthlyExpense > 0
                      ? `${(d.monthlyExpense / (d.monthlyIncome + d.monthlyExpense)) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-neutral-600">Resultado</span>
              <span className={`text-sm font-bold ${d.monthlyIncome - d.monthlyExpense >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(d.monthlyIncome - d.monthlyExpense)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      {d.recentTransactions && d.recentTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Últimas Transações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {d.recentTransactions.slice(0, 5).map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-3">
                    {tx.type === 'INCOME' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm text-neutral-900 line-clamp-1">{tx.description}</p>
                      <p className="text-xs text-neutral-400">
                        {new Date(tx.date).toLocaleDateString('pt-BR')}
                        {tx.bankAccount && ` · ${tx.bankAccount.bankName}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'INCOME' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export function Financial() {
  const navigate = useNavigate()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={() => navigate('/')} className="flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-700 transition-colors mb-1">
          <ArrowLeft className="h-3.5 w-3.5" />
          Dashboard
        </button>
        <h1 className="text-2xl font-bold text-neutral-900">Financeiro</h1>
        <p className="mt-1 text-neutral-600">
          Gerencie receitas, despesas e extratos bancários
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="transactions">Transações</TabsTrigger>
          <TabsTrigger value="accounts">Contas Bancárias</TabsTrigger>
          <TabsTrigger value="reconciliation">Conciliação</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardCards />
        </TabsContent>

        <TabsContent value="transactions">
          <TransactionList />
        </TabsContent>

        <TabsContent value="accounts">
          <BankAccountList />
        </TabsContent>

        <TabsContent value="reconciliation">
          <ReconciliationView />
        </TabsContent>
      </Tabs>
    </div>
  )
}
