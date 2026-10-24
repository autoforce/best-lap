import { cn } from '@/lib/utils'

/** The Best Lap mark: a gauge with an almost full score arc, on the brand blue */
export function LogoMark({ className, title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn('h-8 w-8 shrink-0', className)}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <rect width="32" height="32" rx="8" fill="hsl(var(--primary))" />
      <path
        d="M9.64 22.86A9 9 0 1 1 22.36 22.86"
        fill="none"
        stroke="#fff"
        strokeOpacity={0.32}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <path d="M9.64 22.86A9 9 0 1 1 24.46 13.42" fill="none" stroke="#fff" strokeWidth={3} strokeLinecap="round" />
      <path d="M16 16.5 21.17 14.62" stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
      <circle cx="16" cy="16.5" r="2.1" fill="#fff" />
    </svg>
  )
}

/** Mark and wordmark; the text follows the theme */
export function Logo({ className, size = 'md' }: { className?: string; size?: 'md' | 'lg' }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={size === 'lg' ? 'h-11 w-11' : 'h-8 w-8'} />
      <span
        className={cn(
          'font-bold tracking-tight text-foreground',
          size === 'lg' ? 'text-3xl' : 'text-xl'
        )}
      >
        Best <span className="text-primary">Lap</span>
      </span>
    </span>
  )
}
