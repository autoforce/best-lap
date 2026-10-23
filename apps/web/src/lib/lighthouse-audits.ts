/**
 * Portuguese titles and a practical hint for the Lighthouse audits that show up most.
 * PageSpeed Insights always answers in English, so the dashboard translates by audit id
 * and falls back to the original title for anything not listed here.
 */
const AUDITS: Record<string, { title: string; hint: string }> = {
  // Lighthouse 12+/13 "insights"
  'image-delivery-insight': {
    title: 'Melhore a entrega de imagens',
    hint: 'Sirva imagens em WebP ou AVIF, no tamanho em que aparecem na tela, e comprima os banners.',
  },
  'render-blocking-insight': {
    title: 'Requisições que bloqueiam a renderização',
    hint: 'Carregue CSS e JavaScript não essenciais com defer/async ou depois do primeiro conteúdo.',
  },
  'cache-insight': {
    title: 'Use tempos de cache eficientes',
    hint: 'Configure Cache-Control longo para arquivos estáticos versionados (imagens, JS, CSS, fontes).',
  },
  'lcp-breakdown-insight': {
    title: 'Detalhamento do LCP',
    hint: 'Veja qual fase atrasa o maior elemento: resposta do servidor, descoberta, download ou renderização.',
  },
  'lcp-discovery-insight': {
    title: 'Descoberta da imagem do LCP',
    hint: 'A imagem principal deve estar no HTML inicial, sem lazy load e com fetchpriority="high".',
  },
  'document-latency-insight': {
    title: 'Latência do documento',
    hint: 'Reduza o tempo de resposta do servidor e evite redirecionamentos antes do HTML.',
  },
  'third-parties-insight': {
    title: 'Scripts de terceiros',
    hint: 'Revise chat, pixels e widgets: adie o carregamento ou remova os que não trazem resultado.',
  },
  'font-display-insight': {
    title: 'Exibição de fontes',
    hint: 'Use font-display: swap e pré-carregue apenas as fontes usadas acima da dobra.',
  },
  'cls-culprits-insight': {
    title: 'Causas de mudança de layout',
    hint: 'Defina largura e altura em imagens, banners e iframes, e reserve espaço para conteúdo dinâmico.',
  },
  'legacy-javascript-insight': {
    title: 'JavaScript legado',
    hint: 'Pare de enviar polyfills e transpilação para navegadores antigos que ninguém mais usa.',
  },
  'duplicated-javascript-insight': {
    title: 'JavaScript duplicado',
    hint: 'O mesmo módulo está em mais de um bundle; unifique as dependências.',
  },
  'dom-size-insight': {
    title: 'Otimize o tamanho do DOM',
    hint: 'Páginas com muitos elementos (listas de estoque longas) ficam lentas; pagine ou virtualize.',
  },
  'forced-reflow-insight': {
    title: 'Reflow forçado',
    hint: 'Algum script lê medidas do layout logo após alterá-lo; agrupe leituras e escritas.',
  },
  'network-dependency-tree-insight': {
    title: 'Cadeia de requisições',
    hint: 'Recursos críticos dependem de outros em sequência; use preload/preconnect para encurtar a cadeia.',
  },
  'inp-breakdown-insight': {
    title: 'Detalhamento do INP',
    hint: 'Interações demoram a responder; divida tarefas longas de JavaScript.',
  },
  'modern-http-insight': {
    title: 'HTTP moderno',
    hint: 'Sirva os arquivos por HTTP/2 ou HTTP/3.',
  },
  'viewport-insight': {
    title: 'Viewport para celular',
    hint: 'Inclua a meta viewport com width=device-width.',
  },
  // Classic audits
  'unused-javascript': {
    title: 'Reduza o JavaScript não usado',
    hint: 'Carregue scripts só nas páginas que precisam deles e divida o bundle por rota.',
  },
  'unused-css-rules': {
    title: 'Reduza o CSS não usado',
    hint: 'Remova estilos de componentes que a página não usa ou carregue-os sob demanda.',
  },
  'unminified-javascript': { title: 'Minifique o JavaScript', hint: 'Ative a minificação na build.' },
  'unminified-css': { title: 'Minifique o CSS', hint: 'Ative a minificação na build.' },
  'bootup-time': {
    title: 'Reduza o tempo de execução do JavaScript',
    hint: 'Muito JavaScript roda ao abrir a página; adie o que não é necessário de imediato.',
  },
  'mainthread-work-breakdown': {
    title: 'Diminua o trabalho da thread principal',
    hint: 'Scripts, estilos e layout ocupam o processador do celular; reduza JavaScript e efeitos.',
  },
  'long-tasks': {
    title: 'Evite tarefas longas',
    hint: 'Tarefas de mais de 50 ms travam a página; quebre o trabalho em partes menores.',
  },
  'total-byte-weight': {
    title: 'Página pesada demais',
    hint: 'O total baixado é grande; comece pelas imagens e pelos scripts de terceiros.',
  },
  'server-response-time': {
    title: 'Reduza o tempo de resposta do servidor',
    hint: 'Ative cache de página no servidor ou CDN para o HTML.',
  },
  'offscreen-images': {
    title: 'Adie imagens fora da tela',
    hint: 'Use loading="lazy" nas imagens abaixo da dobra (nunca na imagem principal).',
  },
  'modern-image-formats': { title: 'Use formatos de imagem modernos', hint: 'Converta para WebP ou AVIF.' },
  'uses-optimized-images': { title: 'Comprima as imagens', hint: 'Reduza a qualidade de JPEG para 75–85%.' },
  'uses-responsive-images': {
    title: 'Use imagens no tamanho certo',
    hint: 'Gere versões menores com srcset para o celular.',
  },
  'uses-long-cache-ttl': {
    title: 'Use tempos de cache eficientes',
    hint: 'Configure Cache-Control longo para arquivos estáticos versionados.',
  },
  'uses-rel-preconnect': {
    title: 'Pré-conecte às origens necessárias',
    hint: 'Adicione <link rel="preconnect"> para CDNs e fontes usadas no início.',
  },
  'redirects': { title: 'Evite redirecionamentos', hint: 'Aponte links e anúncios direto para a URL final.' },
  'non-composited-animations': {
    title: 'Evite animações não compostas',
    hint: 'Anime só transform e opacity.',
  },
  'unsized-images': {
    title: 'Defina largura e altura nas imagens',
    hint: 'Sem dimensões, o layout pula quando a imagem carrega (CLS).',
  },
  'lcp-lazy-loaded': {
    title: 'Imagem principal com lazy load',
    hint: 'Remova loading="lazy" da imagem do LCP.',
  },
  'prioritize-lcp-image': {
    title: 'Priorize a imagem principal',
    hint: 'Pré-carregue a imagem do LCP com fetchpriority="high".',
  },
  'third-party-summary': {
    title: 'Scripts de terceiros',
    hint: 'Revise chat, pixels e widgets: adie ou remova os que não trazem resultado.',
  },
  'dom-size': {
    title: 'DOM grande demais',
    hint: 'Pagine ou virtualize listas longas.',
  },
  'font-display': {
    title: 'Texto invisível enquanto a fonte carrega',
    hint: 'Use font-display: swap.',
  },
  'duplicated-javascript': {
    title: 'JavaScript duplicado',
    hint: 'Unifique dependências repetidas entre bundles.',
  },
  'legacy-javascript': {
    title: 'JavaScript legado',
    hint: 'Pare de enviar polyfills para navegadores antigos.',
  },
}

export function auditTitle(id: string, fallback: string) {
  return AUDITS[id]?.title ?? fallback
}

export function auditHint(id: string, fallbackDescription?: string) {
  return AUDITS[id]?.hint ?? fallbackDescription
}

export function formatSavings(ms?: number, bytes?: number) {
  const parts: string[] = []
  if (ms) parts.push(`−${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} s`)
  if (bytes) {
    const kb = bytes / 1024
    parts.push(kb >= 1024 ? `${(kb / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.round(kb)} KB`)
  }
  return parts.join(' · ')
}
