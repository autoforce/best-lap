import type {
  PageSnapshotData,
  SnapshotGroupAggregate,
  SnapshotResource,
} from '../modules/insights/page-snapshot.interface'

/** Who usually fixes it: the template team, the dealer's marketing tags, the content team or the server/domain setup */
export type FixOwner = 'template' | 'tags' | 'content' | 'server'

export interface Recommendation {
  id: string
  owner: FixOwner
  impact: 'high' | 'medium' | 'low'
  title: string
  detail: string
  evidence: string[]
}

export interface SnapshotChange {
  kind:
    | 'weight'
    | 'type_weight'
    | 'third_party_added'
    | 'third_party_removed'
    | 'third_party_changed'
    | 'new_heavy_file'
    | 'lcp_element'
    | 'redirect'
    | 'server_response'
  direction: 'worse' | 'better' | 'neutral'
  title: string
  detail?: string
}

const TYPE_LABELS: Record<string, string> = {
  image: 'Imagens',
  script: 'JavaScript',
  font: 'Fontes',
  stylesheet: 'CSS',
  document: 'HTML',
  media: 'Vídeo e áudio',
  other: 'Outros',
}

export function formatBytes(bytes: number): string {
  const abs = Math.abs(bytes)
  if (abs >= 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
  return `${Math.round(bytes / 1024).toLocaleString('pt-BR')} KB`
}

export function formatMs(ms: number): string {
  if (Math.abs(ms) >= 1000) return `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`
  return `${Math.round(ms)} ms`
}

const IMPACT_ORDER = { high: 0, medium: 1, low: 2 }
const DIRECTION_ORDER = { worse: 0, neutral: 1, better: 2 }

const byImpact = (a: Recommendation, b: Recommendation) => IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact]

/** A change counts when it passes both an absolute and a relative threshold */
const notable = (before: number, after: number, minAbs: number, minRatio: number) =>
  Math.abs(after - before) >= minAbs && Math.abs(after - before) >= Math.abs(before) * minRatio

function describeResource(r: SnapshotResource): string {
  const parts = [r.key]
  if (r.count && r.count > 1) parts.push(`${r.count}×`)
  if (r.wasted_ms) parts.push(formatMs(r.wasted_ms))
  if (r.wasted_bytes) parts.push(`${formatBytes(r.wasted_bytes)} a economizar`)
  else if (r.total_bytes) parts.push(formatBytes(r.total_bytes))
  return parts.join(' · ')
}

/**
 * What changed between two snapshots of the same page: weight, third parties that came or went,
 * new heavy files, the LCP element, redirects and server time. Worse first.
 */
export function compareSnapshots(current: PageSnapshotData, previous: PageSnapshotData): SnapshotChange[] {
  const changes: SnapshotChange[] = []

  if (current.total_bytes !== undefined && previous.total_bytes !== undefined) {
    const before = previous.total_bytes
    const after = current.total_bytes
    if (notable(before, after, 300 * 1024, 0.1)) {
      changes.push({
        kind: 'weight',
        direction: after > before ? 'worse' : 'better',
        title: `A página ficou ${formatBytes(Math.abs(after - before))} ${after > before ? 'mais pesada' : 'mais leve'}`,
        detail: `${formatBytes(before)} → ${formatBytes(after)}`,
      })
    }
  }

  for (const type of ['image', 'script', 'font', 'stylesheet', 'media']) {
    const before = previous.bytes_by_type[type] ?? 0
    const after = current.bytes_by_type[type] ?? 0
    if (notable(before, after, 200 * 1024, 0.15)) {
      changes.push({
        kind: 'type_weight',
        direction: after > before ? 'worse' : 'better',
        title: `${TYPE_LABELS[type]}: ${after > before ? '+' : '−'}${formatBytes(Math.abs(after - before))}`,
        detail: `${formatBytes(before)} → ${formatBytes(after)}`,
      })
    }
  }

  const before = new Map(previous.third_parties.filter((t) => !t.own).map((t) => [t.entity, t]))
  const after = new Map(current.third_parties.filter((t) => !t.own).map((t) => [t.entity, t]))
  for (const [entity, tp] of after) {
    const old = before.get(entity)
    if (!old) {
      const relevant = tp.main_thread_ms >= 50 || tp.bytes >= 20 * 1024
      changes.push({
        kind: 'third_party_added',
        direction: relevant ? 'worse' : 'neutral',
        title: `Novo terceiro: ${entity}`,
        detail: `${formatBytes(tp.bytes)} · ${formatMs(tp.main_thread_ms)} de processamento`,
      })
    } else if (notable(old.main_thread_ms, tp.main_thread_ms, 300, 0.3) || notable(old.bytes, tp.bytes, 200 * 1024, 0.3)) {
      const worse = tp.main_thread_ms - old.main_thread_ms + (tp.bytes - old.bytes) / 1024 > 0
      changes.push({
        kind: 'third_party_changed',
        direction: worse ? 'worse' : 'better',
        title: `${entity} ${worse ? 'ficou mais pesado' : 'ficou mais leve'}`,
        detail: `${formatMs(old.main_thread_ms)} → ${formatMs(tp.main_thread_ms)} · ${formatBytes(old.bytes)} → ${formatBytes(tp.bytes)}`,
      })
    }
  }
  for (const [entity, tp] of before) {
    if (!after.has(entity)) {
      changes.push({
        kind: 'third_party_removed',
        direction: tp.main_thread_ms >= 50 || tp.bytes >= 20 * 1024 ? 'better' : 'neutral',
        title: `Saiu: ${entity}`,
        detail: `Pesava ${formatBytes(tp.bytes)} · ${formatMs(tp.main_thread_ms)}`,
      })
    }
  }

  const knownKeys = new Set(previous.resources.map((r) => r.key))
  for (const r of current.resources) {
    if (r.audit !== 'total-byte-weight' || knownKeys.has(r.key) || (r.total_bytes ?? 0) < 150 * 1024) continue
    changes.push({
      kind: 'new_heavy_file',
      direction: 'worse',
      title: `Novo arquivo pesado: ${formatBytes(r.total_bytes!)}`,
      detail: r.key,
    })
  }

  if (current.lcp?.selector && previous.lcp?.selector && current.lcp.selector !== previous.lcp.selector) {
    changes.push({
      kind: 'lcp_element',
      direction: 'neutral',
      title: 'O elemento principal (LCP) mudou',
      detail: `${previous.lcp.label || previous.lcp.selector} → ${current.lcp.label || current.lcp.selector}`,
    })
  }

  const redirectBefore = previous.checks.redirect_ms ?? 0
  const redirectAfter = current.checks.redirect_ms ?? 0
  if ((redirectBefore === 0) !== (redirectAfter === 0)) {
    changes.push({
      kind: 'redirect',
      direction: redirectAfter > 0 ? 'worse' : 'better',
      title: redirectAfter > 0 ? `Passou a redirecionar antes de abrir (+${formatMs(redirectAfter)})` : 'Deixou de redirecionar antes de abrir',
    })
  }

  const serverBefore = previous.checks.server_response_ms
  const serverAfter = current.checks.server_response_ms
  if (serverBefore !== undefined && serverAfter !== undefined && notable(serverBefore, serverAfter, 400, 0.5)) {
    changes.push({
      kind: 'server_response',
      direction: serverAfter > serverBefore ? 'worse' : 'better',
      title: `Resposta do servidor ${serverAfter > serverBefore ? 'mais lenta' : 'mais rápida'}`,
      detail: `${formatMs(serverBefore)} → ${formatMs(serverAfter)}`,
    })
  }

  return changes.sort((a, b) => DIRECTION_ORDER[a.direction] - DIRECTION_ORDER[b.direction])
}

/** Fixed rules over one snapshot: each one names the cause, who fixes it and the evidence */
export function buildPageRecommendations(snapshot: PageSnapshotData): Recommendation[] {
  const recs: Recommendation[] = []
  const { lcp, checks } = snapshot
  const resources = (audit: string, own?: boolean) =>
    snapshot.resources.filter((r) => r.audit === audit && (own === undefined || r.own === own))
  const sum = (items: SnapshotResource[], field: 'wasted_ms' | 'wasted_bytes' | 'total_bytes') =>
    items.reduce((total, r) => total + (r[field] ?? 0), 0)
  const lcpElement = lcp?.label || lcp?.selector

  if (lcp?.is_image && lcp.lazy_loaded) {
    recs.push({
      id: 'lcp-lazy',
      owner: 'template',
      impact: 'high',
      title: 'A imagem principal usa carregamento tardio (loading="lazy")',
      detail: 'O navegador só busca a imagem depois de montar a página. Remova o loading="lazy" do primeiro banner.',
      evidence: lcpElement ? [`Elemento: ${lcpElement}`] : [],
    })
  }
  if (lcp?.is_image && lcp.discoverable === false) {
    recs.push({
      id: 'lcp-not-discoverable',
      owner: 'template',
      impact: 'high',
      title: 'A imagem principal não está no HTML inicial',
      detail: 'Ela só aparece depois que um script ou CSS roda. Coloque a imagem no HTML ou pré-carregue com <link rel="preload">.',
      evidence: lcpElement ? [`Elemento: ${lcpElement}`] : [],
    })
  }
  if (lcp?.is_image && lcp.priority_hinted === false && (lcp.load_delay_ms ?? 0) >= 300) {
    recs.push({
      id: 'lcp-priority',
      owner: 'template',
      impact: 'medium',
      title: `A imagem principal espera ${formatMs(lcp.load_delay_ms!)} para começar a baixar`,
      detail: 'Aplique fetchpriority="high" na imagem do primeiro banner para ela passar na frente dos outros arquivos.',
      evidence: lcpElement ? [`Elemento: ${lcpElement}`] : [],
    })
  }
  if (lcp?.is_image && (lcp.load_duration_ms ?? 0) >= 800) {
    const images = resources('image-delivery-insight').slice(0, 3)
    recs.push({
      id: 'lcp-heavy-image',
      owner: 'content',
      impact: 'high',
      title: `A imagem principal leva ${formatMs(lcp.load_duration_ms!)} para baixar`,
      detail: 'Exporte o banner em WebP ou AVIF, no tamanho em que aparece no celular, e comprima.',
      evidence: images.map(describeResource),
    })
  }
  if ((lcp?.render_delay_ms ?? 0) >= 1000) {
    recs.push({
      id: 'lcp-render-delay',
      owner: 'template',
      impact: 'medium',
      title: `O elemento principal já chegou, mas leva ${formatMs(lcp!.render_delay_ms!)} para aparecer`,
      detail: 'Scripts e CSS ocupam o navegador antes de desenhar o banner. Adie o JavaScript que não é da primeira dobra.',
      evidence: resources('render-blocking-insight').slice(0, 3).map(describeResource),
    })
  }

  const ttfb = lcp?.ttfb_ms ?? checks.server_response_ms
  if (ttfb !== undefined && ttfb >= 800) {
    recs.push({
      id: 'slow-server',
      owner: 'server',
      impact: ttfb >= 1500 ? 'high' : 'medium',
      title: `O servidor demora ${formatMs(ttfb)} para responder`,
      detail: 'Antes de qualquer arquivo, o HTML precisa chegar. Verifique cache de página e CDN do domínio.',
      evidence: [],
    })
  }
  if ((checks.redirect_ms ?? 0) > 0) {
    recs.push({
      id: 'redirect',
      owner: 'server',
      impact: (checks.redirect_ms ?? 0) >= 300 ? 'medium' : 'low',
      title: `O endereço redireciona antes de abrir (+${formatMs(checks.redirect_ms!)})`,
      detail: 'Cadastre e divulgue a URL final (com ou sem www, com https) para evitar o desvio.',
      evidence: [],
    })
  }
  if (checks.compression === false) {
    recs.push({
      id: 'no-compression',
      owner: 'server',
      impact: 'high',
      title: 'O HTML é enviado sem compressão',
      detail: 'Ative gzip ou brotli no servidor ou na CDN.',
      evidence: [],
    })
  }

  const tags = snapshot.third_parties.filter((t) => !t.own)
  const tagsMs = tags.reduce((total, t) => total + t.main_thread_ms, 0)
  if (tagsMs >= 800) {
    recs.push({
      id: 'third-party-cost',
      owner: 'tags',
      impact: tagsMs >= 2000 ? 'high' : 'medium',
      title: `Tags de terceiros ocupam ${formatMs(tagsMs)} do processamento`,
      detail: 'Revise as tags no Google Tag Manager: remova as que ninguém usa e dispare as demais depois da interação ou do carregamento.',
      evidence: tags
        .filter((t) => t.main_thread_ms > 0)
        .sort((a, b) => b.main_thread_ms - a.main_thread_ms)
        .slice(0, 4)
        .map((t) => `${t.entity}: ${formatMs(t.main_thread_ms)} · ${formatBytes(t.bytes)}`),
    })
  }
  const googleTags = snapshot.resources.find((r) => r.audit === 'total-byte-weight' && r.key.endsWith('googletagmanager.com/gtag/js'))
  const gtm = tags.find((t) => t.entity === 'Google Tag Manager')
  if (gtm && gtm.requests >= 3) {
    recs.push({
      id: 'many-google-tags',
      owner: 'tags',
      impact: 'medium',
      title: `${gtm.requests} scripts do Google Tag Manager/gtag carregados`,
      detail: 'Cada ID de Analytics, Ads ou GTM baixa e executa o próprio script. Concentre as tags num único contêiner do GTM.',
      evidence: [`Google Tag Manager: ${formatBytes(gtm.bytes)} · ${formatMs(gtm.main_thread_ms)}`, ...(googleTags ? [describeResource(googleTags)] : [])],
    })
  }

  const imageBytes = snapshot.bytes_by_type.image ?? 0
  const imageItems = resources('image-delivery-insight')
  if (imageBytes >= 1.5 * 1024 * 1024 || sum(imageItems, 'wasted_bytes') >= 500 * 1024) {
    recs.push({
      id: 'heavy-images',
      owner: 'content',
      impact: imageBytes >= 3 * 1024 * 1024 ? 'high' : 'medium',
      title: `As imagens somam ${formatBytes(imageBytes)}`,
      detail: `Dá para economizar cerca de ${formatBytes(sum(imageItems, 'wasted_bytes'))} convertendo para WebP/AVIF e redimensionando para o celular.`,
      evidence: imageItems.slice(0, 4).map(describeResource),
    })
  }

  const blocking = resources('render-blocking-insight', true)
  if (sum(blocking, 'wasted_ms') >= 300) {
    recs.push({
      id: 'render-blocking',
      owner: 'template',
      impact: sum(blocking, 'wasted_ms') >= 800 ? 'high' : 'medium',
      title: `CSS e JavaScript do template seguram a primeira pintura por ${formatMs(sum(blocking, 'wasted_ms'))}`,
      detail: 'Deixe no carregamento inicial só o CSS da primeira dobra e carregue o resto com defer.',
      evidence: blocking.slice(0, 3).map(describeResource),
    })
  }
  const unusedOwn = resources('unused-javascript', true)
  if (sum(unusedOwn, 'wasted_bytes') >= 200 * 1024) {
    recs.push({
      id: 'unused-js-own',
      owner: 'template',
      impact: 'medium',
      title: `${formatBytes(sum(unusedOwn, 'wasted_bytes'))} de JavaScript do template sem uso nesta página`,
      detail: 'Divida o código por página e carregue sob demanda o que não aparece na home.',
      evidence: unusedOwn.slice(0, 3).map(describeResource),
    })
  }
  const legacyOwn = resources('legacy-javascript-insight', true)
  if (sum(legacyOwn, 'wasted_bytes') >= 20 * 1024) {
    recs.push({
      id: 'legacy-js',
      owner: 'template',
      impact: 'low',
      title: 'O template envia JavaScript para navegadores antigos',
      detail: 'Ajuste o build para navegadores modernos e evite polyfills desnecessários.',
      evidence: legacyOwn.slice(0, 3).map(describeResource),
    })
  }
  const cacheOwn = resources('cache-insight', true)
  if (sum(cacheOwn, 'total_bytes') >= 200 * 1024) {
    recs.push({
      id: 'short-cache',
      owner: 'server',
      impact: 'low',
      title: 'Arquivos da plataforma com cache curto',
      detail: 'Arquivos versionados podem ter Cache-Control de um ano; quem volta ao site não baixa de novo.',
      evidence: cacheOwn.slice(0, 3).map(describeResource),
    })
  }
  if ((checks.unsized_images ?? 0) >= 5) {
    recs.push({
      id: 'unsized-images',
      owner: 'template',
      impact: 'low',
      title: `${checks.unsized_images} imagens sem largura e altura definidas`,
      detail: 'Sem as dimensões, o layout pula quando a imagem chega (CLS). Defina width e height ou aspect-ratio.',
      evidence: [],
    })
  }

  return recs.sort(byImpact)
}

/**
 * Rules over a group (theme or provider): what repeats across most sites is usually fixed once,
 * in the template or in a shared tag setup.
 */
export function buildGroupRecommendations(group: SnapshotGroupAggregate): Recommendation[] {
  const n = group.channels_with_data
  if (n < 3) return []
  const recs: Recommendation[] = []
  const share = (count: number) => count / n
  const ofSites = (count: number) => `${count} de ${n} sites`

  if (share(group.lcp.lazy_loaded) >= 0.2) {
    recs.push({
      id: 'group-lcp-lazy',
      owner: 'template',
      impact: 'high',
      title: `${ofSites(group.lcp.lazy_loaded)} carregam a imagem principal com loading="lazy"`,
      detail: 'Quando é tão comum, vem do componente de banner do template. Remova o lazy do primeiro slide.',
      evidence: [],
    })
  }
  if (share(group.lcp.not_discoverable) >= 0.2) {
    recs.push({
      id: 'group-lcp-not-discoverable',
      owner: 'template',
      impact: 'high',
      title: `Em ${ofSites(group.lcp.not_discoverable)}, a imagem principal não está no HTML inicial`,
      detail: 'O banner depende de JavaScript ou CSS para aparecer. Renderize a primeira imagem no HTML.',
      evidence: [],
    })
  }
  if (group.lcp.image >= 3 && group.lcp.missing_priority_hint / group.lcp.image >= 0.5) {
    recs.push({
      id: 'group-lcp-priority',
      owner: 'template',
      impact: 'medium',
      title: `${ofSites(group.lcp.missing_priority_hint)} não priorizam a imagem principal`,
      detail: 'Aplique fetchpriority="high" na primeira imagem do banner, no componente do template.',
      evidence: group.lcp.avg_load_delay_ms ? [`Espera média para começar a baixar: ${formatMs(group.lcp.avg_load_delay_ms)}`] : [],
    })
  }
  if ((group.lcp.avg_render_delay_ms ?? 0) >= 1000) {
    recs.push({
      id: 'group-render-delay',
      owner: 'template',
      impact: 'medium',
      title: `Em média, o elemento principal leva ${formatMs(group.lcp.avg_render_delay_ms!)} para aparecer depois de baixado`,
      detail: 'Scripts e CSS ocupam o navegador antes do banner. Adie o JavaScript que não é da primeira dobra.',
      evidence: [],
    })
  }
  if ((group.lcp.avg_ttfb_ms ?? 0) >= 800) {
    recs.push({
      id: 'group-slow-server',
      owner: 'server',
      impact: 'medium',
      title: `O servidor demora ${formatMs(group.lcp.avg_ttfb_ms!)} em média para responder`,
      detail: 'Verifique o cache de página e a CDN da plataforma para estes sites.',
      evidence: [],
    })
  }

  const templateFiles = group.resources.filter(
    (r) => r.own && share(r.channels) >= 0.6 && ((r.avg_wasted_ms ?? 0) >= 200 || (r.avg_wasted_bytes ?? 0) >= 50 * 1024)
  )
  if (templateFiles.length) {
    recs.push({
      id: 'group-template-files',
      owner: 'template',
      impact: 'high',
      title: `${templateFiles.length} ${templateFiles.length === 1 ? 'arquivo do template pesa' : 'arquivos do template pesam'} na maioria dos sites`,
      detail: 'Corrigir uma vez no template melhora todos os sites que o usam.',
      evidence: templateFiles.slice(0, 4).map((r) => {
        const cost = r.avg_wasted_ms ? formatMs(r.avg_wasted_ms) : formatBytes(r.avg_wasted_bytes ?? 0)
        return `${r.key} · ${ofSites(r.channels)} · ${cost} em média`
      }),
    })
  }

  const commonTags = group.third_parties.filter((t) => share(t.channels) >= 0.5 && t.avg_main_thread_ms >= 300)
  if (commonTags.length) {
    recs.push({
      id: 'group-common-tags',
      owner: 'tags',
      impact: 'medium',
      title: 'Tags de terceiros pesadas na maioria dos sites',
      detail: 'Vale uma recomendação padrão de instalação para os clientes (GTM único, tags disparadas depois do carregamento).',
      evidence: commonTags
        .slice(0, 4)
        .map((t) => `${t.entity} · ${ofSites(t.channels)} · ${formatMs(t.avg_main_thread_ms)} em média`),
    })
  }

  const avgImages = group.weight.avg_bytes_by_type.image ?? 0
  if (avgImages >= 1.5 * 1024 * 1024) {
    recs.push({
      id: 'group-heavy-images',
      owner: 'content',
      impact: 'medium',
      title: `As imagens somam ${formatBytes(avgImages)} por home, em média`,
      detail: 'Defina um padrão de exportação de banners (WebP/AVIF, largura máxima para celular) e um limite de peso.',
      evidence: [],
    })
  }

  return recs.sort(byImpact)
}

/** Day in the given time zone, as YYYY-MM-DD */
export function localDay(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
