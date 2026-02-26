import { Link, useLocation } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Radio,
  BarChart3,
  GitCompare,
  Layers,
  Box,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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
    name: 'Providers',
    href: '/providers',
    icon: Box,
  },
  {
    name: 'Métricas',
    href: '/metrics',
    icon: BarChart3,
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
    name: 'Usuários',
    href: '/users',
    icon: Users,
  },
]

export function Sidebar() {
  const location = useLocation()

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center px-6 border-b">
        <h1 className="text-xl font-bold text-primary">Best Lap</h1>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
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
