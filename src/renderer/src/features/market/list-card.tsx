import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ListCardProps {
  title: string
  description: string
  icon: LucideIcon
  /** Controls shown on the right of the title (toggles, switches) */
  action?: React.ReactNode
  className?: string
  contentClassName?: string
  children: React.ReactNode
}

/** Card with a gold icon title, used by the market lists and side panels. */
export function ListCard({
  title,
  description,
  icon: Icon,
  action,
  className,
  contentClassName,
  children
}: ListCardProps): React.JSX.Element {
  return (
    <Card className={cn('gap-3 py-4', className)}>
      <CardHeader className="flex flex-wrap items-start gap-2 px-4">
        <Icon className="mt-0.5 size-4 shrink-0 text-wf-gold" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-0.5">
          <CardTitle>
            <h2 className="text-[15px]">{title}</h2>
          </CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn('px-2', contentClassName)}>{children}</CardContent>
    </Card>
  )
}
