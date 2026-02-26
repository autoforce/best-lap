import { Trash2 } from 'lucide-react'
import { useUsers, useDeleteUser } from '@/hooks/use-users'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'

export function UsersTable() {
  const { data: users = [], isLoading } = useUsers()
  const deleteUser = useDeleteUser()
  const { toast } = useToast()

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${userName}"?`)) {
      return
    }

    try {
      await deleteUser.mutateAsync(userId)
      toast({
        title: 'Usuário excluído',
        description: 'Usuário excluído com sucesso.',
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao excluir o usuário.',
        variant: 'destructive',
      })
    }
  }

  if (isLoading) {
    return <div>Carregando...</div>
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Criado em</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell className="font-medium">{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString('pt-BR')
                : '-'}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(user.id, user.name)}
                disabled={deleteUser.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
