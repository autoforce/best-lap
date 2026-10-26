import { useState } from 'react'
import { Pencil, Power, PowerOff, Trash2, ExternalLink } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  useDeleteChannel,
  useEnableChannel,
  useDisableChannel,
} from '@/hooks/use-channels'
import { useToast } from '@/hooks/use-toast'
import type { Channel } from '@/types/api'
import { externalUrl } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ChannelInfoTabProps {
  channel: Channel
  onEdit: () => void
}

export function ChannelInfoTab({ channel, onEdit }: ChannelInfoTabProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const deleteChannel = useDeleteChannel()
  const enableChannel = useEnableChannel()
  const disableChannel = useDisableChannel()

  const handleDelete = async () => {
    try {
      await deleteChannel.mutateAsync(channel.id)
      toast({
        title: 'Canal deletado',
        description: 'O canal foi deletado com sucesso.',
      })
      navigate({ to: '/channels' })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao deletar o canal.',
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async () => {
    try {
      if (channel.active) {
        await disableChannel.mutateAsync(channel.id)
        toast({
          title: 'Canal desativado',
          description: `O canal ${channel.name} foi desativado.`,
        })
      } else {
        await enableChannel.mutateAsync(channel.id)
        toast({
          title: 'Canal ativado',
          description: `O canal ${channel.name} foi ativado.`,
        })
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao alterar o status do canal.',
        variant: 'destructive',
      })
    }
  }

  const isLoading =
    deleteChannel.isPending ||
    enableChannel.isPending ||
    disableChannel.isPending

  return (
    <>
      <div className="space-y-6">
        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={onEdit} disabled={isLoading}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar Canal
          </Button>
          <Button
            variant="outline"
            onClick={handleToggleActive}
            disabled={isLoading}
          >
            {channel.active ? (
              <>
                <PowerOff className="mr-2 h-4 w-4" />
                Desativar
              </>
            ) : (
              <>
                <Power className="mr-2 h-4 w-4" />
                Ativar
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isLoading}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Deletar Canal
          </Button>
        </div>

        {/* Channel Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Canal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Nome
                </p>
                <p className="text-lg font-semibold">{channel.name}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Status
                </p>
                <Badge
                  variant={channel.active ? 'default' : 'secondary'}
                  className="mt-1"
                >
                  {channel.active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Domínio
                </p>
                <a
                  href={externalUrl(channel.domain)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 text-primary hover:underline"
                >
                  {channel.domain}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Link Interno
                </p>
                <a
                  href={externalUrl(channel.internal_link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1 break-all text-primary hover:underline"
                >
                  {channel.internal_link}
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Tema
                </p>
                <Badge variant="outline" className="mt-1">
                  {channel.theme}
                </Badge>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Canal de Referência
                </p>
                <p className="mt-1">
                  {channel.is_reference ? (
                    <Badge variant="outline">Sim</Badge>
                  ) : (
                    'Não'
                  )}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Provider
                </p>
                {channel.provider ? (
                  <div className="mt-1">
                    <p className="font-medium">{channel.provider.name}</p>
                    {channel.provider.website && (
                      <a
                        href={externalUrl(channel.provider.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        {channel.provider.website}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-muted-foreground">-</p>
                )}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Criado em
                </p>
                <p className="mt-1">
                  {channel.created_at && !isNaN(new Date(channel.created_at).getTime())
                    ? format(new Date(channel.created_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })
                    : '-'}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Atualizado em
                </p>
                <p className="mt-1">
                  {channel.updated_at && !isNaN(new Date(channel.updated_at).getTime())
                    ? format(new Date(channel.updated_at), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })
                    : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Statistics Card - Can be expanded with more metrics */}
        {/* <Card>
          <CardHeader>
            <CardTitle>Estatísticas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Métricas
                </p>
                <p className="text-sm">Em breve...</p>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso irá deletar permanentemente
              o canal <strong>{channel.name}</strong> e todas as páginas e
              métricas associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
