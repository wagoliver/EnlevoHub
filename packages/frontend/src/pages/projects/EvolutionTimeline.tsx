import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { projectsAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { PhotoUpload } from './PhotoUpload'
import {
  Plus,
  Trash2,
  Calendar,
  TrendingUp,
  Loader2,
  User,
  ImageIcon,
} from 'lucide-react'
import { usePermission } from '@/hooks/usePermission'

const evolutionFormSchema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  percentage: z.coerce.number().min(0).max(100, 'Máximo 100%'),
  phase: z.string().min(2, 'Fase é obrigatória'),
  notes: z.string().optional(),
})

type EvolutionFormValues = z.infer<typeof evolutionFormSchema>

interface EvolutionTimelineProps {
  projectId: string
}

export function EvolutionTimeline({ projectId }: EvolutionTimelineProps) {
  const [showForm, setShowForm] = useState(false)
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([])
  const queryClient = useQueryClient()
  const canEdit = usePermission('projects:edit')

  const { data: evolutions = [], isLoading } = useQuery({
    queryKey: ['evolutions', projectId],
    queryFn: () => projectsAPI.listEvolutions(projectId),
  })

  const form = useForm<EvolutionFormValues>({
    resolver: zodResolver(evolutionFormSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      percentage: 0,
      phase: '',
      notes: '',
    },
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => projectsAPI.createEvolution(projectId, data),
    onSuccess: () => {
      toast.success('Evolução registrada!')
      queryClient.invalidateQueries({ queryKey: ['evolutions', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      setShowForm(false)
      setUploadedPhotos([])
      form.reset({
        date: new Date().toISOString().split('T')[0],
        percentage: 0,
        phase: '',
        notes: '',
      })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (evolutionId: string) =>
      projectsAPI.deleteEvolution(projectId, evolutionId),
    onSuccess: () => {
      toast.success('Evolução excluída!')
      queryClient.invalidateQueries({ queryKey: ['evolutions', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (error: Error) => {
      toast.error(error.message)
    },
  })

  const onSubmit = (values: EvolutionFormValues) => {
    createMutation.mutate({
      date: new Date(values.date).toISOString(),
      percentage: values.percentage,
      phase: values.phase,
      notes: values.notes || undefined,
      photos: uploadedPhotos.length > 0 ? uploadedPhotos : undefined,
    })
  }

  // Prepare chart data (reversed so oldest is first)
  const chartData = [...evolutions]
    .reverse()
    .map((e: any) => ({
      date: format(new Date(e.date), 'dd/MM', { locale: ptBR }),
      percentage: e.percentage,
    }))

  const currentProgress =
    evolutions.length > 0 ? evolutions[0].percentage : 0

  const apiBaseUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
    : 'http://localhost:3001'

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-base font-medium">
            Progresso Atual
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-neutral-500" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={currentProgress} className="flex-1" />
            <span className="text-lg font-bold">{currentProgress}%</span>
          </div>
          {evolutions.length > 0 && (
            <p className="mt-2 text-sm text-neutral-500">
              Fase atual: {evolutions[0].phase}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Progress Chart */}
      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-medium">
              Evolução do Progresso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis domain={[0, 100]} fontSize={12} />
                <Tooltip
                  formatter={(value: number) => [`${value}%`, 'Progresso']}
                />
                <Line
                  type="monotone"
                  dataKey="percentage"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: 'hsl(var(--primary))' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Add Evolution Button */}
      {canEdit && (
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Evolução
          </Button>
        </div>
      )}

      {/* Timeline */}
      {evolutions.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border bg-neutral-50 p-12">
          <Calendar className="h-12 w-12 text-neutral-300" />
          <h3 className="mt-4 text-lg font-medium text-neutral-900">
            Nenhuma evolução registrada
          </h3>
          <p className="mt-2 text-sm text-neutral-500">
            Registre o progresso da obra para acompanhar a evolução.
          </p>
        </div>
      ) : (
        <div className="relative space-y-0">
          {/* Vertical line */}
          <div className="absolute left-4 top-0 h-full w-0.5 bg-neutral-200" />

          {evolutions.map((evolution: any) => (
            <div key={evolution.id} className="relative flex gap-4 pb-8">
              {/* Timeline dot */}
              <div className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background">
                <div className="h-3 w-3 rounded-full bg-primary" />
              </div>

              {/* Content */}
              <Card className="flex-1">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{evolution.phase}</h4>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {evolution.percentage}%
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-sm text-neutral-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(evolution.date), "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </span>
                        {evolution.user && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {evolution.user.name}
                          </span>
                        )}
                      </div>
                    </div>

                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-neutral-400 hover:text-destructive"
                        onClick={() => {
                          if (confirm('Excluir esta evolução?')) {
                            deleteMutation.mutate(evolution.id)
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {evolution.notes && (
                    <p className="mt-3 text-sm text-neutral-600">
                      {evolution.notes}
                    </p>
                  )}

                  {/* Photos */}
                  {evolution.photos &&
                    Array.isArray(evolution.photos) &&
                    evolution.photos.length > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center gap-1 text-sm text-neutral-500 mb-2">
                          <ImageIcon className="h-3 w-3" />
                          <span>{evolution.photos.length} foto(s)</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {(evolution.photos as string[]).map(
                            (photo, photoIndex) => (
                              <img
                                key={photoIndex}
                                src={
                                  photo.startsWith('http')
                                    ? photo
                                    : `${apiBaseUrl}${photo}`
                                }
                                alt={`Foto ${photoIndex + 1}`}
                                className="aspect-square rounded-md object-cover"
                              />
                            )
                          )}
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Create Evolution Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Evolução</DialogTitle>
            <DialogDescription>
              Registre o progresso da obra com fotos e anotações.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="evo-date">Data *</Label>
                <Input
                  id="evo-date"
                  type="date"
                  {...form.register('date')}
                />
                {form.formState.errors.date && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.date.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="evo-percentage">Progresso (%) *</Label>
                <Input
                  id="evo-percentage"
                  type="number"
                  min="0"
                  max="100"
                  {...form.register('percentage')}
                />
                {form.formState.errors.percentage && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.percentage.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="evo-phase">Fase *</Label>
              <Input
                id="evo-phase"
                {...form.register('phase')}
                placeholder="Ex: Fundação, Estrutura, Acabamento..."
              />
              {form.formState.errors.phase && (
                <p className="text-sm text-destructive mt-1">
                  {form.formState.errors.phase.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="evo-notes">Observações</Label>
              <Textarea
                id="evo-notes"
                {...form.register('notes')}
                placeholder="Anotações sobre o progresso..."
                rows={3}
              />
            </div>

            <div>
              <Label>Fotos</Label>
              <PhotoUpload
                projectId={projectId}
                existingPhotos={uploadedPhotos}
                onUploadComplete={(urls) =>
                  setUploadedPhotos((prev) => [...prev, ...urls])
                }
                onRemovePhoto={(url) =>
                  setUploadedPhotos((prev) => prev.filter((p) => p !== url))
                }
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Registrar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
