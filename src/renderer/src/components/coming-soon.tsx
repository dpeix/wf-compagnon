import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ComingSoonProps {
  title: string
  description: string
  upcoming: readonly string[]
}

/** Placeholder for a section described in plan.md but not built yet; it is the panel's main title. */
export function ComingSoon({ title, description, upcoming }: ComingSoonProps): React.JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <h1>{title}</h1>
          <Badge variant="outline">À venir</Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {upcoming.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
