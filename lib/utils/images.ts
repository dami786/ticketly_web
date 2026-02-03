import type { Event } from "../api/events";
import { BACKEND_API_URL } from "../config";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800";

/**
 * Backend origin (protocol + host), e.g. https://your-backend.com
 */
function getBackendOrigin(): string {
  try {
    return new URL(BACKEND_API_URL).origin;
  } catch {
    return BACKEND_API_URL.replace(/\/api\/?$/, "").replace(/\/$/, "");
  }
}

/**
 * Resolve full event image URL from API response.
 * Response: GET /api/events → event.imageUrl = "/uploads/events/event_xxx.jpeg" (relative path).
 * Final URL: origin + path → https://your-backend.com/uploads/events/event_xxx.jpeg
 */
/** Backend se aa sakne wale image field names (priority order). */
const EVENT_IMAGE_KEYS = [
  "imageUrl",
  "image",
  "image_url",
  "coverImage",
  "thumbnail",
  "imagePath",
] as const;

function getEventImageValue(event: Record<string, any>): string | null {
  for (const key of EVENT_IMAGE_KEYS) {
    const v = event[key];
    if (v != null && typeof v === "string" && v.trim()) return v.trim();
    if (v != null && typeof v === "object" && typeof v.url === "string" && v.url.trim())
      return v.url.trim();
  }
  return null;
}

export function getEventImageUrl(event: Partial<Event> & Record<string, any>) {
  // Pehle backend se aayi hui image use karo; sirf na ho to fallback
  let img: string | null = getEventImageValue(event ?? {});

  // Debug logging in development
  if (process.env.NODE_ENV === "development" && event?.title) {
    console.log(`[getEventImageUrl] Event: ${event.title}`, {
      hasImage: !!event.image,
      hasImageUrl: !!event.imageUrl,
      resolved: img ? `${img.substring(0, 80)}...` : "null → fallback",
      backendOrigin: getBackendOrigin(),
    });
  }

  if (!img) {
    return FALLBACK_IMAGE;
  }

  const trimmed = img;

  if (trimmed === "null" || trimmed === "undefined") {
    return FALLBACK_IMAGE;
  }

  // Absolute URL or base64
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    // If backend returns localhost/127 URLs, rewrite to deployed API origin
    if (trimmed.includes("localhost") || trimmed.includes("127.0.0.1")) {
      try {
        const url = new URL(trimmed);
        const path = url.pathname || "";
        return `${getBackendOrigin()}${path}`;
      } catch {
        const uploadsIndex = trimmed.indexOf("/uploads");
        if (uploadsIndex !== -1) {
          const path = trimmed.substring(uploadsIndex);
          return `${getBackendOrigin()}${path}`;
        }
      }
    }
    return trimmed;
  }

  // Relative path: response "/uploads/events/event_xxx.jpeg" → origin + path
  if (trimmed.startsWith("/")) {
    return `${getBackendOrigin()}${trimmed}`;
  }
  return `${getBackendOrigin()}/${trimmed}`;
}

/**
 * Resolve correct profile image URL from user data.
 * - Uses `profileImage` or `profileImageUrl` field from the user
 * - Handles localhost URLs and rewrites them to deployed API origin
 * - Returns null if no image is available
 */
export function getProfileImageUrl(user: {
  profileImage?: string | null;
  profileImageUrl?: string | null;
}): string | null {
  if (!user) return null;

  // Prefer profileImageUrl, fallback to profileImage
  const rawImage = user.profileImageUrl || user.profileImage;

  if (!rawImage || typeof rawImage !== "string") {
    return null;
  }

  const trimmed = rawImage.trim();

  if (!trimmed || trimmed === "null" || trimmed === "undefined") {
    return null;
  }

  // Absolute URL or base64
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    // If backend returns localhost/127 URLs, rewrite to deployed API origin
    if (trimmed.includes("localhost") || trimmed.includes("127.0.0.1")) {
      try {
        const url = new URL(trimmed);
        const path = url.pathname || "";
        return `${getBackendOrigin()}${path}`;
      } catch {
        const uploadsIndex = trimmed.indexOf("/uploads");
        if (uploadsIndex !== -1) {
          const path = trimmed.substring(uploadsIndex);
          return `${getBackendOrigin()}${path}`;
        }
      }
    }
    return trimmed;
  }

  // Relative path (e.g. "/uploads/profiles/xxx") — origin + path
  if (trimmed.startsWith("/")) {
    return `${getBackendOrigin()}${trimmed}`;
  }
  return `${getBackendOrigin()}/${trimmed}`;
}

export { FALLBACK_IMAGE };


