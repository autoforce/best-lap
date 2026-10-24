import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { BookOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'best-lap-welcome-dismissed'

function wasDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

/** First-visit hint pointing to the guide; hidden for good once closed */
export function WelcomeBanner() {
  const [hidden, setHidden] = useState(wasDismissed)
  if (hidden) return null

  const dismiss = () => {
    setHidden(true)
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // Storage blocked: the banner just shows again next visit
    }
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 space-y-1 text-sm">
        <p className="font-medium">Primeira vez por aqui?</p>
        <p className="text-muted-foreground">
          Cada número vem com uma faixa do Google (Bom, Precisa melhorar, Ruim) e com a variação contra o período
          anterior. O botão “Alertas”, no topo, lista o que piorou; abra um canal para ver o que corrigir.
        </p>
        <Link to="/guide" className="inline-block font-medium text-primary hover:underline">
          Ler o guia de 3 minutos →
        </Link>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={dismiss} aria-label="Fechar aviso">
        <X />
      </Button>
    </div>
  )
}
