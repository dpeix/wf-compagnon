import { useEffect, useState } from 'react'

function msUntilNextHour(now: Date): number {
  const next = new Date(now)
  next.setHours(now.getHours() + 1, 0, 0, 0)
  return next.getTime() - now.getTime()
}

/** Current hour (0–23), updated when the clock reaches the next full hour. */
export function useCurrentHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = (): void => {
      timer = setTimeout(() => {
        setHour(new Date().getHours())
        schedule()
      }, msUntilNextHour(new Date()))
    }
    schedule()
    return () => {
      clearTimeout(timer)
    }
  }, [])

  return hour
}
