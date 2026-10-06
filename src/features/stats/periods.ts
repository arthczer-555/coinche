export type Period = 'week' | 'month' | 'season' | 'all';

/** Début de la période (la saison = le trimestre en cours). Arrondi à l'heure pour garder un cache stable. */
export function periodStart(period: Period, now = new Date()): string | null {
  const d = new Date(now);
  d.setMinutes(0, 0, 0);
  if (period === 'all') return null;
  if (period === 'week') {
    d.setHours(0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  } else if (period === 'month') {
    d.setHours(0);
    d.setDate(1);
  } else {
    d.setHours(0);
    d.setDate(1);
    d.setMonth(Math.floor(d.getMonth() / 3) * 3);
  }
  return d.toISOString();
}
