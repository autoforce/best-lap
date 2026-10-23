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
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useCreateChannel, useUpdateChannel } from '@/hooks/use-channels'
import { useProviders } from '@/hooks/use-providers'
import { useToast } from '@/hooks/use-toast'
import type { Channel } from '@/types/api'

const channelFormSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  domain: z
    .string()
    .refine(
      (val) => {
        // Permite domínio vazio
        if (!val || val.trim() === '') return true

        // Aceita URLs completas ou domínios simples
        if (val.startsWith('http://') || val.startsWith('https://')) {
          try {
            new URL(val)
            return true
          } catch {
            return false
          }
        }
        // Valida formato de domínio simples (ex: exemplo.com.br)
        return /^[a-zA-Z0-9][a-zA-Z0-9-_.]+[a-zA-Z0-9]\.[a-zA-Z]{2,}$/.test(val)
      },
      { message: 'Domínio inválido. Use um domínio válido (ex: exemplo.com.br) ou URL completa' }
    ),
  internal_link: z.string().min(1, 'Link interno é obrigatório'),
  theme: z.string().min(1, 'Tema é obrigatório'),
  is_reference: z.boolean().default(false),
  provider_id: z.string().optional(),
})

type ChannelFormData = z.infer<typeof channelFormSchema>

interface ChannelDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channel?: Channel | null
}

export function ChannelDialog({
  open,
  onOpenChange,
  channel,
}: ChannelDialogProps) {
  const { toast } = useToast()
  const createChannel = useCreateChannel()
  const updateChannel = useUpdateChannel()
  const { data: providers = [] } = useProviders()

  const isEditing = !!channel

  const form = useForm<ChannelFormData>({
    resolver: zodResolver(channelFormSchema),
    defaultValues: {
      name: '',
      domain: '',
      internal_link: '',
      theme: '',
      is_reference: false,
      provider_id: undefined,
    },
  })

  // Reset form when dialog opens/closes or channel changes
  useEffect(() => {
    if (open && channel) {
      form.reset({
        name: channel.name,
        domain: channel.domain,
        internal_link: channel.internal_link,
        theme: channel.theme,
        is_reference: channel.is_reference,
        provider_id: channel.provider_id,
      })
    } else if (open && !channel) {
      form.reset({
        name: '',
        domain: '',
        internal_link: '',
        theme: '',
        is_reference: false,
        provider_id: undefined,
      })
    }
  }, [open, channel, form])

  const onSubmit = async (data: ChannelFormData) => {
    try {
      if (isEditing) {
        await updateChannel.mutateAsync({
          channelId: channel.id,
          data,
        })
        toast({
          title: 'Canal atualizado',
          description: 'O canal foi atualizado com sucesso.',
        })
      } else {
        await createChannel.mutateAsync(data)
        toast({
          title: 'Canal criado',
          description: 'O canal foi criado com sucesso.',
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
            : 'Ocorreu um erro ao salvar o canal.',
        variant: 'destructive',
      })
    }
  }

  const isLoading = createChannel.isPending || updateChannel.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Canal' : 'Criar Novo Canal'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Atualize as informações do canal.'
              : 'Preencha os dados para criar um novo canal.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Meu Site"
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
            <Label htmlFor="domain">Domínio (Opcional)</Label>
            <Input
              id="domain"
              placeholder="exemplo.com.br ou https://exemplo.com.br"
              {...form.register('domain')}
              disabled={isLoading}
            />
            {form.formState.errors.domain && (
              <p className="text-sm text-destructive">
                {form.formState.errors.domain.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="internal_link">Link Interno</Label>
            <Input
              id="internal_link"
              placeholder="Ex: meu-site"
              {...form.register('internal_link')}
              disabled={isLoading}
            />
            {form.formState.errors.internal_link && (
              <p className="text-sm text-destructive">
                {form.formState.errors.internal_link.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Tema</Label>
            <Input
              id="theme"
              placeholder="Ex: automotivo"
              {...form.register('theme')}
              disabled={isLoading}
            />
            {form.formState.errors.theme && (
              <p className="text-sm text-destructive">
                {form.formState.errors.theme.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="provider_id">Provedor (opcional)</Label>
            <Select
              value={form.watch('provider_id') || 'none'}
              onValueChange={(value) =>
                form.setValue('provider_id', value === 'none' ? undefined : value)
              }
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_reference"
              checked={form.watch('is_reference')}
              onCheckedChange={(checked) =>
                form.setValue('is_reference', checked)
              }
              disabled={isLoading}
            />
            <Label htmlFor="is_reference" className="cursor-pointer">
              Canal de Referência
            </Label>
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
                  : 'Criar Canal'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
