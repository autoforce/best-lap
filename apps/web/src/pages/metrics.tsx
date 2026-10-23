import { Navigate, useNavigate, useSearch } from '@tanstack/react-router'
import { Activity } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { Card, CardContent } from '@/components/ui/card'
import { ChannelCombobox } from '@/components/ui/channel-combobox'
import { useChannels } from '@/hooks/use-channels'

/**
 * Metrics now live in the Performance tab of each channel.
 * This route keeps old links working and offers a quick channel picker.
 */
export function MetricsPage() {
  const search = useSearch({ from: '/metrics' }) as { channelId?: string }
  const navigate = useNavigate()
  const { data: channels, isLoading } = useChannels()

  if (search.channelId) {
    return <Navigate to="/channels/$channelId" params={{ channelId: search.channelId }} replace />
  }

  return (
    <AppShell
      title="Métricas"
      description="As métricas de cada canal ficam na aba Performance do canal"
      breadcrumbs={[{ label: 'Métricas' }]}
    >
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <Activity className="h-12 w-12 text-muted-foreground/50" />
          <p className="max-w-md text-sm text-muted-foreground">
            Escolha um canal para abrir a performance dele. Você também pode chegar lá pela lista de Canais.
          </p>
          <div className="w-full max-w-md">
            <ChannelCombobox
              channels={channels || []}
              value=""
              onValueChange={(channelId) =>
                channelId && navigate({ to: '/channels/$channelId', params: { channelId } })
              }
              disabled={isLoading}
              placeholder="Selecione um canal"
            />
          </div>
        </CardContent>
      </Card>
    </AppShell>
  )
}
