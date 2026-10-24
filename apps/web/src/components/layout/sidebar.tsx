import { Link, useLocation } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Radio,
  GitCompare,
  Layers,
  Box,
  Users,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/brand/logo'

const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
  },
  {
    name: 'Canais',
    href: '/channels',
    icon: Radio,
  },
  {
    name: 'Comparação',
    href: '/compare',
    icon: GitCompare,
  },
  {
    name: 'Por Tema',
    href: '/themes',
    icon: Layers,
  },
  {
    name: 'Provedores',
    href: '/providers',
    icon: Box,
  },
  {
    name: 'Usuários',
    href: '/users',
    icon: Users,
  },
  {
    name: 'Como ler',
    href: '/guide',
    icon: BookOpen,
  },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  // Sub pages (e.g. /channels/:id) keep their section highlighted
  return pathname === href || pathname.startsWith(`${href}/`)
}

interface SidebarProps {
  className?: string
  onNavigate?: () => void
}

export function Sidebar({ className, onNavigate }: SidebarProps) {
  const location = useLocation()
  // The old metrics screen now lives inside the channel page
  const pathname = location.pathname === '/metrics' ? '/channels' : location.pathname

  return (
    <div className={cn('flex h-full w-64 flex-col border-r bg-card', className)}>
      <div className="flex h-16 items-center px-6 border-b">
        <Link to="/" onClick={onNavigate} aria-label="Best Lap, ir para o Dashboard">
          <Logo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4" aria-label="Navegação principal">
        {navigation.map((item) => {
          const isActive = isActivePath(pathname, item.href)
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
