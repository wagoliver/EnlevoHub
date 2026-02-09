import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI, contractorsAPI } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Upload, X, Image as ImageIcon } from 'lucide-react'

interface MeasurementFormDialogProps {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultActivityId?: string
  defaultUnitActivityId?: string
}

export function MeasurementFormDialog({
  projectId,
  open,
  onOpenChange,
  defaultActivityId,
  defaultUnitActivityId,
}: MeasurementFormDialogProps) {
  const queryClient = useQueryClient()

  const [activityId, setActivityId] = useState(defaultActivityId || '')
  const [unitActivityId, setUnitActivityId] = useState(
    defaultUnitActivityId || ''
  )
  const [contractorId, setContractorId] = useState('')
  const [progress, setProgress] = useState(0)
  const [notes, setNotes] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset form when dialog opens or defaults change
  useEffect(() => {
    if (open) {
      setActivityId(defaultActivityId || '')
      setUnitActivityId(defaultUnitActivityId || '')
      setContractorId('')
      setProgress(0)
      setNotes('')
      setPhotoUrls([])
    }
  }, [open, defaultActivityId, defaultUnitActivityId])

  // Fetch activities for selection
  const { data: activities = [] } = useQuery({
    queryKey: ['project-activities', projectId],
    queryFn: () => projectsAPI.listActivities(projectId),
    enabled: open,
  })

  // Fetch contractors for selection
  const { data: contractors = [] } = useQuery({
    queryKey: ['project-contractors', projectId],
    queryFn: () => contractorsAPI.listByProject(projectId),
    enabled: open,
  })

  // Find selected activity and its unit activities
  const selectedActivity = activities.find((a: any) => a.id === activityId)
  const unitActivities = selectedActivity?.unitActivities || []

  // Find current progress of selected unit activity
  const selectedUnitActivity = unitActivities.find(
    (ua: any) => ua.id === unitActivityId
  )
  const currentProgress = selectedUnitActivity?.progress ?? 0

  // When activity changes, auto-select unitActivityId if only one (e.g. GENERAL scope)
  // or reset if current selection is no longer valid
  useEffect(() => {
    if (activityId && selectedActivity) {
      const uas = selectedActivity.unitActivities || []
      const uaIds = uas.map((ua: any) => ua.id)
      if (uas.length === 1) {
        setUnitActivityId(uas[0].id)
      } else if (unitActivityId && !uaIds.includes(unitActivityId)) {
        setUnitActivityId('')
      }
    }
  }, [activityId, selectedActivity, unitActivityId])

  // Photo upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('photos', file)
      })
      return projectsAPI.uploadMeasurementPhotos(projectId, formData)
    },
    onSuccess: (data) => {
      toast.success('Fotos enviadas!')
      setPhotoUrls((prev) => [...prev, ...data.urls])
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar fotos: ${error.message}`)
    },
  })

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      const validFiles = Array.from(files).filter((file) => {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} não é uma imagem válida`)
          return false
        }
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} excede o limite de 10MB`)
          return false
        }
        return true
      })

      if (validFiles.length > 0) {
        uploadMutation.mutate(validFiles)
      }
    },
    [uploadMutation]
  )

  const removePhoto = (url: string) => {
    setPhotoUrls((prev) => prev.filter((p) => p !== url))
  }

  // Create measurement mutation
  const createMutation = useMutation({
    mutationFn: (data: any) =>
      projectsAPI.createMeasurement(projectId, data),
    onSuccess: () => {
      toast.success('Medição registrada com sucesso!')
      queryClient.invalidateQueries({
        queryKey: ['project-measurements', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['project-activities', projectId],
      })
      queryClient.invalidateQueries({
        queryKey: ['project-progress', projectId],
      })
      onOpenChange(false)
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao registrar medição')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!activityId) {
      toast.error('Selecione uma atividade')
      return
    }

    if (unitActivities.length > 0 && !unitActivityId) {
      toast.error('Selecione uma unidade')
      return
    }

    if (progress < 0 || progress > 100) {
      toast.error('Progresso deve estar entre 0 e 100')
      return
    }

    const data: any = {
      activityId,
      progress,
      notes: notes.trim() || undefined,
      photos: photoUrls.length > 0 ? photoUrls : undefined,
    }

    if (unitActivityId) {
      data.unitActivityId = unitActivityId
    }

    if (contractorId && contractorId !== 'none') {
      data.contractorId = contractorId
    }

    createMutation.mutate(data)
  }

  const isPending = createMutation.isPending || uploadMutation.isPending

  const apiBaseUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
    : 'http://localhost:3001'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Medição</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Activity Select */}
          <div>
            <Label htmlFor="measurement-activity">Atividade *</Label>
            <Select value={activityId} onValueChange={setActivityId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a atividade..." />
              </SelectTrigger>
              <SelectContent>
                {activities.map((activity: any) => (
                  <SelectItem key={activity.id} value={activity.id}>
                    {activity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* UnitActivity Select - show only when multiple units */}
          {unitActivities.length > 1 && (
            <div>
              <Label htmlFor="measurement-unit-activity">Unidade *</Label>
              <Select
                value={unitActivityId}
                onValueChange={setUnitActivityId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade..." />
                </SelectTrigger>
                <SelectContent>
                  {unitActivities.map((ua: any) => (
                    <SelectItem key={ua.id} value={ua.id}>
                      {ua.unit?.code || 'Geral'}{' '}
                      {ua.unit?.type ? `(${ua.unit.type})` : ''} -{' '}
                      {Math.round(ua.progress ?? 0)}% atual
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {unitActivities.length === 1 && (
            <p className="text-sm text-neutral-500">
              Escopo: <span className="font-medium text-neutral-700">{unitActivities[0].unit?.code || 'Atividade geral (completa)'}</span>
              {' '}- {Math.round(unitActivities[0].progress ?? 0)}% atual
            </p>
          )}

          {/* Contractor Select */}
          <div>
            <Label htmlFor="measurement-contractor">
              Empreiteiro (opcional)
            </Label>
            <Select
              value={contractorId}
              onValueChange={setContractorId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o empreiteiro..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {(Array.isArray(contractors) ? contractors : []).map(
                  (item: any) => {
                    const c = item.contractor || item
                    return (
                      <SelectItem
                        key={c.id}
                        value={c.id}
                      >
                        {c.name}
                      </SelectItem>
                    )
                  }
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Progress */}
          <div>
            <Label htmlFor="measurement-progress">Progresso (%) *</Label>
            <Input
              id="measurement-progress"
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
            />
            {selectedUnitActivity && (
              <p className="mt-1 text-xs text-neutral-500">
                Progresso atual: {Math.round(currentProgress)}%
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="measurement-notes">Observações</Label>
            <Textarea
              id="measurement-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anotações sobre a medição..."
              rows={3}
            />
          </div>

          {/* Photo Upload */}
          <div>
            <Label>Fotos</Label>
            <div
              className="mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 p-6 transition-colors hover:border-neutral-400"
              onClick={() => fileInputRef.current?.click()}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="mt-2 text-sm text-neutral-600">
                    Enviando fotos...
                  </p>
                </>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-neutral-400" />
                  <p className="mt-2 text-sm font-medium text-neutral-700">
                    Clique para selecionar fotos
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    PNG, JPG, WEBP (max. 10MB cada)
                  </p>
                </>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    handleFiles(e.target.files)
                    e.target.value = ''
                  }
                }}
              />
            </div>

            {/* Photo previews */}
            {photoUrls.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {photoUrls.map((url, index) => (
                  <div key={index} className="group relative aspect-square">
                    <img
                      src={url.startsWith('http') ? url : `${apiBaseUrl}${url}`}
                      alt={`Foto ${index + 1}`}
                      className="h-full w-full rounded-lg object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={() => removePhoto(url)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {photoUrls.length === 0 && !uploadMutation.isPending && (
              <div className="mt-2 flex items-center justify-center rounded-lg border bg-neutral-50 p-3">
                <ImageIcon className="mr-2 h-4 w-4 text-neutral-400" />
                <span className="text-sm text-neutral-500">
                  Nenhuma foto adicionada
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Registrar Medição
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
