import type { Event } from "../api/events";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800";

/**
 * Resolve correct event image URL from API data.
 * - Uses `image` or `imageUrl` field from the event
 * - Falls back to a default Unsplash image
 * - If backend returns a relative path (e.g. /uploads/events/xyz.jpg),
 *   it prefixes with the API base origin so that it works from the frontend domain.
 */
export function getEventImageUrl(event: Partial<Event> & Record<string, any>) {
  // Prefer main image field, but fall back to possible alternative names
  let img: unknown = event.image ?? event.imageUrl ?? event.image_url ?? null;

  if (!img || typeof img !== "string") {
    return FALLBACK_IMAGE;
  }

  const trimmed = img.trim();

  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return FALLBACK_IMAGE;
  }

  // Absolute URL or base64
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // Relative path from backend (e.g. /uploads/events/xyz.jpg)
  if (trimmed.startsWith("/")) {
    const apiBase =
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      "https://ticketlybackend-production.up.railway.app/api";

    // Remove trailing /api if present to get the host origin
    const origin = apiBase.replace(/\/api\/?$/, "");
    return `${origin}${trimmed}`;
  }

  // Anything else – return as-is
  return trimmed;
}

export { FALLBACK_IMAGE };


