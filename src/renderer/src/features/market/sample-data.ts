// Example hourly profile for the screens that do not have real data yet ("Meilleures heures",
// "Mes ordres & suivi"): they need the app's own snapshots and the warframe.market login
// (plan.md). The overview and the item screen use warframe.market through the main process.

/** Usual sales per hour (0–23 h), Paris time: quiet mornings, evening peak. */
export const sampleHourlySales: readonly number[] = [
  38, 30, 22, 16, 11, 9, 10, 14, 20, 27, 33, 38, 44, 48, 50, 53, 58, 66, 75, 86, 94, 100, 82, 55
]
