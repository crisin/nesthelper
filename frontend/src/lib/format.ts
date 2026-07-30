/**
 * Shared display formatting.
 *
 * These lived as private copies in half a dozen components — `timeAgo` existed
 * five times in two languages, and the Dashboard managed to show "3h ago" and
 * "vor 3 Std." next to each other. The app is German; so is this.
 */

/** "gerade eben" · "vor 12 Min." · "vor 3 Std." · "vor 5 Tagen" */
export function timeAgo(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'gerade eben'
  if (minutes < 60) return `vor ${minutes} Min.`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `vor ${hours} Std.`
  const days = Math.floor(hours / 24)
  return days === 1 ? 'vor 1 Tag' : `vor ${days} Tagen`
}

/** Compact variant for tight rows: "jetzt" · "12m" · "3h" · "5d" */
export function timeAgoShort(date: string | Date): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'jetzt'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

/** "Heute" · "Gestern" · "vor 4 T." · "12.03.2026" */
export function formatAdded(date: string | Date): string {
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (days === 0) return 'Heute'
  if (days === 1) return 'Gestern'
  if (days < 7) return `vor ${days} T.`
  if (days < 30) return `vor ${Math.floor(days / 7)} Wo.`
  return formatDate(date)
}

/** "12.03.2026" */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/** Playback position as "3:07". */
export function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * The app stores a primary `artist` plus the full `artists` array; every list
 * wants "all of them, comma-separated, falling back to the primary".
 */
export function displayArtists(
  artists: string[] | null | undefined,
  fallback?: string | null,
): string {
  return artists?.length ? artists.join(', ') : (fallback ?? '')
}
