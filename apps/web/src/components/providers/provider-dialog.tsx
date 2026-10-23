import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateProvider, useUpdateProvider } from '@/hooks/use-providers'
import { useToast } from '@/hooks/use-toast'
import type { Provider } from '@/types/api'

const providerFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  website: z.string().url('Website deve ser uma URL válida'),
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  description: z.string().optional(),
})

type ProviderFormData = z.infer<typeof providerFormSchema>

interface ProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  provider?: Provider | null
}

export function ProviderDialog({
  open,
  onOpenChange,
  provider,
}: ProviderDialogProps) {
  const { toast } = useToast()
  const createProvider = useCreateProvider()
  const updateProvider = useUpdateProvider()

  const isEditing = !!provider

  const form = useForm<ProviderFormData>({
    resolver: zodResolver(providerFormSchema),
    defaultValues: {
      name: '',
      website: '',
      slug: '',
      description: '',
    },
  })

  // Reset form when dialog opens/closes or provider changes
  useEffect(() => {
    if (open && provider) {
      form.reset({
        name: provider.name,
        website: provider.website,
        slug: provider.slug,
        description: provider.description || '',
      })
    } else if (open && !provider) {
      form.reset({
        name: '',
        website: '',
        slug: '',
        description: '',
      })
    }
  }, [open, provider, form])

  const onSubmit = async (data: ProviderFormData) => {
    try {
      if (isEditing) {
        await updateProvider.mutateAsync({
          providerId: provider.id,
          data,
        })
        toast({
          title: 'Provedor atualizado',
          description: 'O provider foi atualizado com sucesso.',
        })
      } else {
        await createProvider.mutateAsync(data)
        toast({
          title: 'Provedor criado',
          description: 'O provider foi criado com sucesso.',
        })
      }
      onOpenChange(false)
      form.reset()
    } catch (error) {
      toast({
        title: 'Erro',
        description:
          error instanceof Error
            ? error.message
            : 'Ocorreu um erro ao salvar o provider.',
        variant: 'destructive',
      })
    }
  }

  const isLoading = createProvider.isPending || updateProvider.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar provedor' : 'Novo provedor'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do provider.'
              : 'Preencha os dados para criar um novo provider.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Autoforce"
              {...form.register('name')}
              disabled={isLoading}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">Website</Label>
            <Input
              id="website"
              type="url"
              placeholder="https://exemplo.com"
              {...form.register('website')}
              disabled={isLoading}
            />
            {form.formState.errors.website && (
              <p className="text-sm text-destructive">
                {form.formState.errors.website.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              placeholder="Ex: autoforce"
              {...form.register('slug')}
              disabled={isLoading}
            />
            {form.formState.errors.slug && (
              <p className="text-sm text-destructive">
                {form.formState.errors.slug.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              placeholder="Ex: Plataforma de criação de sites automotivos"
              {...form.register('description')}
              disabled={isLoading}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-destructive">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? 'Salvando...'
                : isEditing
                  ? 'Atualizar'
                  : 'Criar provedor'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
