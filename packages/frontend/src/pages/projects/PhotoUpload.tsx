import { useState, useRef, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { projectsAPI } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PhotoUploadProps {
  projectId: string
  onUploadComplete: (urls: string[]) => void
  existingPhotos?: string[]
  onRemovePhoto?: (url: string) => void
}

export function PhotoUpload({
  projectId,
  onUploadComplete,
  existingPhotos = [],
  onRemovePhoto,
}: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData()
      files.forEach((file) => {
        formData.append('photos', file)
      })
      return projectsAPI.uploadPhotos(projectId, formData)
    },
    onSuccess: (data) => {
      toast.success('Fotos enviadas com sucesso!')
      onUploadComplete(data.urls)
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles]
  )

  const apiBaseUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api/v1', '')
    : 'http://localhost:3001'

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-neutral-300 hover:border-neutral-400'
        )}
      >
        {uploadMutation.isPending ? (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-2 text-sm text-neutral-600">Enviando fotos...</p>
          </>
        ) : (
          <>
            <Upload className="h-10 w-10 text-neutral-400" />
            <p className="mt-2 text-sm font-medium text-neutral-700">
              Arraste fotos aqui ou clique para selecionar
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

      {/* Photo grid */}
      {existingPhotos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {existingPhotos.map((url, index) => (
            <div key={index} className="group relative aspect-square">
              <img
                src={url.startsWith('http') ? url : `${apiBaseUrl}${url}`}
                alt={`Foto ${index + 1}`}
                className="h-full w-full rounded-lg object-cover"
              />
              {onRemovePhoto && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onRemovePhoto(url)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {existingPhotos.length === 0 && !uploadMutation.isPending && (
        <div className="flex items-center justify-center rounded-lg border bg-neutral-50 p-4">
          <ImageIcon className="mr-2 h-5 w-5 text-neutral-400" />
          <span className="text-sm text-neutral-500">Nenhuma foto adicionada</span>
        </div>
      )}
    </div>
  )
}
