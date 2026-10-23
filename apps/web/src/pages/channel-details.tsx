import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { ChevronLeft } from 'lucide-react'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { ChannelInfoTab } from '@/components/channels/channel-info-tab'
import { ChannelPagesTab } from '@/components/channels/channel-pages-tab'
import { ChannelPerformanceTab } from '@/components/channels/channel-performance-tab'
import { ChannelFixesTab } from '@/components/channels/channel-fixes-tab'
import { ChannelDialog } from '@/components/channels/channel-dialog'
import { useChannel } from '@/hooks/use-channels'
import { useSearchState } from '@/hooks/use-search-state'
import { TriggerCollectionDialog } from '@/components/trigger-collection-dialog'
import { CopyLinkButton } from '@/components/layout/copy-link-button'
import { useTriggerCollectionChannel } from '@/hooks/use-metrics'

const TABS = ['performance', 'pages', 'fix', 'info'] as const
type Tab = (typeof TABS)[number]

export function ChannelDetailsPage() {
  const { channelId } = useParams({ strict: false })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useSearchState<{ tab?: string; page?: string }>()
  const activeTab: Tab = TABS.includes(search.tab as Tab) ? (search.tab as Tab) : 'performance'

  const { data: channel, isLoading, isError } = useChannel(channelId)
  const { mutate: triggerCollectionChannel, isPending: isCollecting } =
    useTriggerCollectionChannel()

  if (isLoading) {
    return (
      <AppShell title="Carregando..." description="Aguarde">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </AppShell>
    )
  }

  if (isError || !channel) {
    return (
      <AppShell title="Canal não encontrado" description="Verifique o endereço ou volte para a lista">
        <div className="flex h-[400px] flex-col items-center justify-center gap-4">
          <p className="text-destructive">
            Não foi possível carregar este canal. Ele pode ter sido removido.
          </p>
          <Button asChild>
            <Link to="/channels">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Voltar para Canais
            </Link>
          </Button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title={channel.name}
      description={channel.domain}
      breadcrumbs={[
        { label: 'Canais', href: '/channels' },
        { label: channel.name },
      ]}
      action={
        <>
          <CopyLinkButton />
          <TriggerCollectionDialog
            scope="channel"
            channelName={channel.name}
            pagesCount={channel.pages?.length || 0}
            onConfirm={() => triggerCollectionChannel(channel.id)}
            isPending={isCollecting}
          />
        </>
      }
    >
      <Tabs
        value={activeTab}
        // Each tab has its own page selection, so it is cleared when switching tabs
        onValueChange={(tab) => setSearch({ tab: tab === 'performance' ? undefined : tab, page: undefined })}
        className="w-full"
      >
        <TabsList className="grid h-auto w-full max-w-[640px] grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="pages">
            Páginas{channel.pages?.length ? ` (${channel.pages.length})` : ''}
          </TabsTrigger>
          <TabsTrigger value="fix">O que corrigir</TabsTrigger>
          <TabsTrigger value="info">Informações</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="mt-6">
          <ChannelPerformanceTab channel={channel} />
        </TabsContent>

        <TabsContent value="pages" className="mt-6">
          <ChannelPagesTab channel={channel} />
        </TabsContent>

        <TabsContent value="fix" className="mt-6">
          <ChannelFixesTab channel={channel} />
        </TabsContent>

        <TabsContent value="info" className="mt-6">
          <ChannelInfoTab
            channel={channel}
            onEdit={() => setDialogOpen(true)}
          />
        </TabsContent>
      </Tabs>

      <ChannelDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        channel={channel}
      />
    </AppShell>
  )
}
