import { useState, type ReactNode } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { Sidebar } from './sidebar'
import { Header } from './header'
import {
  PageBreadcrumbs,
  type BreadcrumbItem,
} from './page-breadcrumbs'

interface AppShellProps {
  children: ReactNode
  title: string
  description?: string
  action?: ReactNode
  breadcrumbs?: BreadcrumbItem[]
}

export function AppShell({
  children,
  title,
  description,
  action,
  breadcrumbs,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar className="hidden lg:flex" />

      {/* Below lg the navigation opens as a drawer */}
      <DialogPrimitive.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
          <DialogPrimitive.Content className="fixed inset-y-0 left-0 z-50 flex shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden">
            <DialogPrimitive.Title className="sr-only">Menu</DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">Navegação entre as seções do Best Lap</DialogPrimitive.Description>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
            <DialogPrimitive.Close
              className="absolute right-3 top-4 rounded-sm p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header
          title={title}
          description={description}
          action={action}
          onOpenMenu={() => setMenuOpen(true)}
        />
        <main className="flex-1 overflow-y-auto bg-background">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <div className="border-b bg-muted/30 px-4 py-3 sm:px-6">
              <PageBreadcrumbs items={breadcrumbs} />
            </div>
          )}
          <div className="p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  )
}
