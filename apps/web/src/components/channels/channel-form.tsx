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
import type { Channel } from '@/types/api'
import { useToast } from '@/hooks/use-toast'

const channelSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  domain: z.string().min(1, 'Domínio é obrigatório'),
  internal_link: z.string().url('Link interno deve ser uma URL válida'),
  theme: z.string().min(1, 'Tema é obrigatório'),
  active: z.boolean().default(true),
  is_reference: z.boolean().default(false),
  provider_id: z.string().optional(),
})

type ChannelFormData = z.infer<typeof channelSchema>

interface ChannelFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  channel?: Channel
}

export function ChannelForm({ open, onOpenChange, channel }: ChannelFormProps) {
  const { toast } = useToast()
  const createChannel = useCreateChannel()
  const updateChannel = useUpdateChannel()
  const { data: providers = [] } = useProviders()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<ChannelFormData>({
    resolver: zodResolver(channelSchema),
    defaultValues: channel || {
      name: '',
      domain: '',
      internal_link: '',
      theme: '',
      active: true,
      is_reference: false,
      provider_id: undefined,
    },
  })

  const onSubmit = async (data: ChannelFormData) => {
    try {
      if (channel) {
        await updateChannel.mutateAsync({ channelId: channel.id, data })
        toast({
          title: 'Canal atualizado',
          description: 'Canal atualizado com sucesso.',
        })
      } else {
        await createChannel.mutateAsync(data)
        toast({
          title: 'Canal criado',
          description: 'Canal criado com sucesso.',
        })
      }
      reset()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao salvar o canal.',
        variant: 'destructive',
      })
    }
  }

  const activeValue = watch('active')
  const referenceValue = watch('is_reference')
  const providerValue = watch('provider_id')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>
            {channel ? 'Editar Canal' : 'Novo Canal'}
          </DialogTitle>
          <DialogDescription>
            {channel
              ? 'Atualize as informações do canal'
              : 'Adicione um novo canal para monitoramento'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="domain">Domínio</Label>
              <Input id="domain" {...register('domain')} />
              {errors.domain && (
                <p className="text-sm text-destructive">{errors.domain.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="internal_link">Link Interno</Label>
              <Input
                id="internal_link"
                type="url"
                {...register('internal_link')}
                placeholder="https://exemplo.com"
              />
              {errors.internal_link && (
                <p className="text-sm text-destructive">
                  {errors.internal_link.message}
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="theme">Tema</Label>
              <Input id="theme" {...register('theme')} />
              {errors.theme && (
                <p className="text-sm text-destructive">{errors.theme.message}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="provider_id">Provedor (opcional)</Label>
              <Select
                value={providerValue}
                onValueChange={(value) => setValue('provider_id', value === 'none' ? undefined : value)}
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

            <div className="flex items-center justify-between">
              <Label htmlFor="active">Ativo</Label>
              <Switch
                id="active"
                checked={activeValue}
                onCheckedChange={(checked) => setValue('active', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="is_reference">Referência</Label>
              <Switch
                id="is_reference"
                checked={referenceValue}
                onCheckedChange={(checked) => setValue('is_reference', checked)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createChannel.isPending || updateChannel.isPending}
            >
              {channel ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
