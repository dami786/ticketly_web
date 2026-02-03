/**
 * Simple localStorage cache with optional TTL.
 * Use for cache-first loading: pehli dafaa fetch, agli dafaa cache se turant show.
 */

const isBrowser = typeof window !== "undefined";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 minutes

export function getCached<T>(key: string): T | null {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      window.localStorage.removeItem(key);
      return null;
    }
    return entry.data ?? null;
  } catch {
    return null;
  }
}

export function setCached<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL_MS): void {
  if (!isBrowser) return;
  try {
    const entry: CacheEntry<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    window.localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore quota / parse errors
  }
}

export function removeCached(key: string): void {
  if (!isBrowser) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export const CACHE_KEYS = {
  EVENTS: "ticketly_events",
  PROFILE: "ticketly_profile",
} as const;

/** Cache key for a single event detail page (by id). */
export function getEventDetailCacheKey(eventId: string): string {
  return `ticketly_event_${eventId}`;
}
