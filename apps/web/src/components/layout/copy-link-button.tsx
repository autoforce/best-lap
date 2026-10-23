import { useState } from 'react'
import { Check, Link2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

/** Copies the current URL, which carries every filter of the screen */
export function CopyLinkButton() {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
      toast({ title: 'Link copiado', description: 'Quem abrir verá esta tela com os mesmos filtros.' })
    } catch {
      toast({
        title: 'Não foi possível copiar',
        description: 'Copie o endereço da barra do navegador.',
        variant: 'destructive',
      })
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? <Check /> : <Link2 />}
      {copied ? 'Copiado' : 'Copiar link'}
    </Button>
  )
}
