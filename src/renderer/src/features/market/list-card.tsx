import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ListCardProps {
  title: string
  description: string
  icon: LucideIcon
  children: React.ReactNode
}

/** Card with a gold icon title, used by the overview lists and side panels. */
export function ListCard({
  title,
  description,
  icon: Icon,
  children
}: ListCardProps): React.JSX.Element {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex items-start gap-2 px-4">
        <Icon className="mt-0.5 size-4 shrink-0 text-wf-gold" aria-hidden="true" />
        <div className="space-y-0.5">
          <CardTitle>
            <h2 className="text-[15px]">{title}</h2>
          </CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2">{children}</CardContent>
    </Card>
  )
}
