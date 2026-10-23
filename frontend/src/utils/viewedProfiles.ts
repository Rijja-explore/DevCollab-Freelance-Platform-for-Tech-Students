/**
 * Remembers which student profiles the current user has opened, most recent first,
 * to drive "freelancers similar to those you viewed" recommendations.
 * Stored per user in localStorage; every access is guarded because storage can be
 * unavailable (private mode, blocked site data).
 */
const MAX_VIEWED = 15

const keyFor = (userId?: string) => `devcollab_viewed_profiles_${userId || 'anonymous'}`

export function getViewedProfiles(userId?: string): string[] {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : []
  } catch {
    return []
  }
}

export function recordProfileView(profileId: string, userId?: string): string[] {
  const next = [profileId, ...getViewedProfiles(userId).filter((id) => id !== profileId)].slice(0, MAX_VIEWED)
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(next))
  } catch {
    // storage unavailable — recommendations simply won't persist across reloads
  }
  return next
}
