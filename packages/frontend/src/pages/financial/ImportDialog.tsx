import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { financialAPI } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface ImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ImportDialog({ open, onOpenChange }: ImportDialogProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)

  const { data: accounts } = useQuery({
    queryKey: ['financial', 'accounts'],
    queryFn: () => financialAPI.listAccounts(),
    enabled: open,
  })

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !selectedAccountId) throw new Error('Selecione conta e arquivo')
      const formData = new FormData()
      formData.append('file', selectedFile)
      return financialAPI.importFile(selectedAccountId, formData)
    },
    onSuccess: (data) => {
      setResult(data)
      queryClient.invalidateQueries({ queryKey: ['financial'] })
      toast.success(`${data.importedCount} transações importadas!`)
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase()
      if (!['ofx', 'csv', 'xls', 'xlsx'].includes(ext || '')) {
        toast.error('Formato não suportado. Use .ofx, .csv, .xls ou .xlsx')
        return
      }
      setSelectedFile(file)
      setResult(null)
    }
  }

  const handleClose = () => {
    setSelectedFile(null)
    setResult(null)
    setSelectedAccountId('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Extrato Bancário</DialogTitle>
          <DialogDescription>
            Importe transações de um arquivo exportado do seu internet banking.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Conta Bancária *</Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {(accounts as any[] || []).map((acc: any) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bankName} - {acc.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Arquivo do Extrato *</Label>
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 p-8 cursor-pointer hover:border-primary/50 hover:bg-neutral-50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <>
                    <FileText className="h-10 w-10 text-primary mb-2" />
                    <p className="text-sm font-medium text-neutral-900">{selectedFile.name}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                    <p className="text-xs text-primary mt-2">Clique para trocar o arquivo</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-neutral-400 mb-2" />
                    <p className="text-sm text-neutral-600">Clique para selecionar o arquivo</p>
                    <p className="text-xs text-neutral-400 mt-1">
                      Formatos aceitos: .ofx, .csv, .xls, .xlsx
                    </p>
                  </>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ofx,.csv,.xls,.xlsx"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                onClick={() => mutation.mutate()}
                disabled={!selectedFile || !selectedAccountId || mutation.isPending}
              >
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Importar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg bg-green-50 p-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-900">Importação concluída!</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-neutral-900">{result.totalRecords}</p>
                <p className="text-xs text-neutral-500">Total no arquivo</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{result.importedCount}</p>
                <p className="text-xs text-neutral-500">Importadas</p>
              </div>
            </div>

            {result.duplicateCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 p-3">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <p className="text-sm text-amber-800">
                  {result.duplicateCount} transação(ões) duplicada(s) foram ignoradas.
                </p>
              </div>
            )}

            {result.periodStart && result.periodEnd && (
              <p className="text-sm text-neutral-500 text-center">
                Período: {new Date(result.periodStart).toLocaleDateString('pt-BR')} a{' '}
                {new Date(result.periodEnd).toLocaleDateString('pt-BR')}
              </p>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Fechar</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
