import { useState } from 'react'
import { AppShell } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { UsersTable } from '@/components/users/users-table'
import { UserDialog } from '@/components/users/user-dialog'

export function UsersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  return (
    <AppShell
      title="Usuários"
      description="Gerencie os usuários do sistema"
      action={
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Usuário
        </Button>
      }
    >
      <UsersTable />
      <UserDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </AppShell>
  )
}
