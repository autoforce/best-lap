import type { FixOwner, Recommendation } from '@/types/api'

export const OWNER_LABELS: Record<FixOwner, string> = {
  template: 'Template',
  tags: 'Tags do cliente',
  content: 'Imagens e conteúdo',
  server: 'Servidor e domínio',
}

export const OWNER_HINTS: Record<FixOwner, string> = {
  template: 'Time de front: vale para todos os sites que usam o tema',
  tags: 'Marketing do cliente ou quem cuida do Google Tag Manager',
  content: 'Quem publica banners e fotos no site',
  server: 'Infraestrutura, CDN e configuração do domínio',
}

export const IMPACT_LABELS: Record<Recommendation['impact'], string> = {
  high: 'Impacto alto',
  medium: 'Impacto médio',
  low: 'Impacto baixo',
}

/** Lighthouse entity categories */
const CATEGORY_LABELS: Record<string, string> = {
  ad: 'Anúncios',
  analytics: 'Análise',
  social: 'Redes sociais',
  'tag-manager': 'Gerenciador de tags',
  marketing: 'Marketing',
  'customer-success': 'Atendimento e chat',
  video: 'Vídeo',
  cdn: 'CDN',
  utility: 'Utilitário',
  hosting: 'Hospedagem',
  content: 'Conteúdo',
  library: 'Biblioteca',
  consent: 'Consentimento',
  other: 'Outros',
}

export function categoryLabel(category?: string) {
  if (!category) return 'Sem categoria'
  return CATEGORY_LABELS[category] ?? category
}

export const TYPE_LABELS: Record<string, string> = {
  image: 'Imagens',
  script: 'JavaScript',
  font: 'Fontes',
  stylesheet: 'CSS',
  document: 'HTML',
  media: 'Vídeo e áudio',
  other: 'Outros',
}

/** One color per resource type, in the order the weight bar draws them */
export const TYPE_ORDER = ['image', 'script', 'font', 'stylesheet', 'document', 'media', 'other']
export const TYPE_COLORS: Record<string, string> = {
  image: 'hsl(var(--chart-1))',
  script: 'hsl(var(--chart-2))',
  font: 'hsl(var(--chart-3))',
  stylesheet: 'hsl(var(--chart-4))',
  document: 'hsl(var(--chart-5))',
  media: 'hsl(var(--chart-6))',
  other: 'hsl(var(--muted-foreground) / 0.5)',
}

/** Short Portuguese label of the audit that flagged a file */
const AUDIT_SHORT_LABELS: Record<string, string> = {
  'render-blocking-insight': 'Bloqueia a renderização',
  'unused-javascript': 'JavaScript sem uso',
  'unused-css-rules': 'CSS sem uso',
  'image-delivery-insight': 'Imagem otimizável',
  'legacy-javascript-insight': 'JavaScript legado',
  'bootup-time': 'Processamento alto',
  'cache-insight': 'Cache curto',
  'font-display-insight': 'Fonte atrasa o texto',
  'total-byte-weight': 'Arquivo pesado',
}

export function auditShortLabel(audit: string) {
  return AUDIT_SHORT_LABELS[audit] ?? audit
}

export function formatBytes(bytes?: number | null) {
  if (bytes === undefined || bytes === null) return '—'
  if (Math.abs(bytes) >= 1024 * 1024) return `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
  return `${Math.round(bytes / 1024).toLocaleString('pt-BR')} KB`
}

export function formatMs(ms?: number | null) {
  if (ms === undefined || ms === null) return '—'
  if (Math.abs(ms) >= 1000) return `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`
  return `${Math.round(ms)} ms`
}

export function formatDay(day: string) {
  const [, month, date] = day.split('-')
  return `${date}/${month}`
}
