import { CircleAlert, LoaderCircle, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { describeLoadError, formatUpdatedAt } from './live-data'
import { useNow } from './use-now'

const MINUTE = 60_000

export function LoadingPanel({ label }: { label: string }): React.JSX.Element {
  return (
    <Card className="items-center gap-3 px-6 py-12 text-center" role="status">
      <LoaderCircle className="size-6 animate-spin text-wf-gold" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  )
}

export function ErrorPanel({
  message,
  onRetry
}: {
  message: string
  onRetry: () => void
}): React.JSX.Element {
  return (
    <Card className="items-center gap-3 px-6 py-12 text-center" role="alert">
      <CircleAlert className="size-6 text-destructive" aria-hidden="true" />
      <p className="text-sm">{message}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw aria-hidden="true" />
        Réessayer
      </Button>
    </Card>
  )
}

/** Shown above data that are still on screen when loading them again failed. */
export function RefreshError({ error }: { error: unknown }): React.JSX.Element {
  return (
    <p
      className="mx-6 mt-6 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive"
      role="alert"
    >
      <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
      Échec de l&apos;actualisation : {describeLoadError(error)} Les données affichées sont les
      précédentes.
    </p>
  )
}

/** Source and age of the data, with a button to load them again. */
export function SourceBar({
  fetchedAt,
  loading,
  onRefresh
}: {
  fetchedAt: Date
  loading: boolean
  onRefresh: () => void
}): React.JSX.Element {
  const now = useNow(MINUTE)
  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline">
        warframe.market · mis à jour {formatUpdatedAt(fetchedAt, now)}
      </Badge>
      <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
        <RefreshCw className={loading ? 'animate-spin' : undefined} aria-hidden="true" />
        {loading ? 'Actualisation…' : 'Actualiser'}
      </Button>
    </div>
  )
}
