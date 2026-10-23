import type { ReactNode } from 'react'
import { LogOut, Menu, Monitor, Moon, Sun } from 'lucide-react'
import { useAuth } from '@/contexts/auth-context'
import { useTheme, type ThemePreference } from '@/contexts/theme-context'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { FreshnessIndicator } from './freshness-indicator'

interface HeaderProps {
  title: string
  description?: string
  action?: ReactNode
  onOpenMenu?: () => void
}

const THEME_OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Seguir o sistema', icon: Monitor },
]

export function Header({ title, description, action, onOpenMenu }: HeaderProps) {
  const { user, logout } = useAuth()
  const { preference, setPreference } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate({ to: '/login' })
  }

  const getUserInitials = () => {
    if (!user?.name) return 'U'
    return user.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="border-b bg-card">
      <div className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {onOpenMenu && (
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 lg:hidden"
              onClick={onOpenMenu}
              aria-label="Abrir menu"
            >
              <Menu />
            </Button>
          )}
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
            {description && (
              <p className="truncate text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <FreshnessIndicator className="hidden 2xl:flex" />
          {action && <div className="hidden flex-wrap gap-2 lg:flex">{action}</div>}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full" aria-label="Menu do usuário">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{getUserInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.name}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Tema</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={preference}
                onValueChange={(value) => setPreference(value as ThemePreference)}
              >
                {THEME_OPTIONS.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value}>
                    <option.icon className="mr-2 h-4 w-4" />
                    {option.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {/* Below lg the actions get their own row so the title never gets squeezed */}
      {action && <div className="flex flex-wrap gap-2 px-4 pb-3 sm:px-6 lg:hidden">{action}</div>}
      <FreshnessIndicator className="border-t px-4 py-2 sm:px-6 2xl:hidden" />
    </div>
  )
}
