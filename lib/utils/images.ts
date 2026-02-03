import type { Event } from "../api/events";
import { BACKEND_API_URL } from "../config";

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

  // Debug logging in development
  if (process.env.NODE_ENV === "development" && event.title) {
    console.log(`[getEventImageUrl] Event: ${event.title}`, {
      hasImage: !!event.image,
      hasImageUrl: !!event.imageUrl,
      hasImage_url: !!event.image_url,
      imageValue: typeof img === "string" ? `${img.substring(0, 50)}...` : img,
      imageType: typeof img
    });
  }

  if (!img || typeof img !== "string") {
    return FALLBACK_IMAGE;
  }

  const trimmed = img.trim();

  if (!trimmed || trimmed === "null" || trimmed === "undefined" || trimmed === "") {
    return FALLBACK_IMAGE;
  }

  // Absolute URL or base64
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    // If backend returns localhost/127 URLs, rewrite them to deployed API origin
    if (trimmed.includes("localhost") || trimmed.includes("127.0.0.1")) {
      try {
        const url = new URL(trimmed);
        const path = url.pathname || "";
        let origin: string;
        try {
          const backendUrl = new URL(BACKEND_API_URL);
          origin = backendUrl.origin;
        } catch {
          origin = BACKEND_API_URL.replace(/\/api\/?$/, "");
        }
        return `${origin}${path}`;
      } catch {
        // Fallback: try to find /uploads
        const uploadsIndex = trimmed.indexOf("/uploads");
        if (uploadsIndex !== -1) {
          const path = trimmed.substring(uploadsIndex);
          let origin: string;
          try {
            const backendUrl = new URL(BACKEND_API_URL);
            origin = backendUrl.origin;
          } catch {
            origin = BACKEND_API_URL.replace(/\/api\/?$/, "");
          }
          return `${origin}${path}`;
        }
      }
    }
    return trimmed;
  }

  // Relative path from backend (e.g. /uploads/events/xyz.jpg)
  if (trimmed.startsWith("/")) {
    // Remove trailing /api if present to get the host origin
    const origin = BACKEND_API_URL.replace(/\/api\/?$/, "");
    return `${origin}${trimmed}`;
  }

  // Anything else – return as-is
  return trimmed;
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
    // If backend returns localhost/127 URLs, rewrite them to deployed API origin
    if (trimmed.includes("localhost") || trimmed.includes("127.0.0.1")) {
      try {
        const url = new URL(trimmed);
        const path = url.pathname || "";
        let origin: string;
        try {
          const backendUrl = new URL(BACKEND_API_URL);
          origin = backendUrl.origin;
        } catch {
          origin = BACKEND_API_URL.replace(/\/api\/?$/, "");
        }
        return `${origin}${path}`;
      } catch {
        // Fallback: try to find /uploads
        const uploadsIndex = trimmed.indexOf("/uploads");
        if (uploadsIndex !== -1) {
          const path = trimmed.substring(uploadsIndex);
          let origin: string;
          try {
            const backendUrl = new URL(BACKEND_API_URL);
            origin = backendUrl.origin;
          } catch {
            origin = BACKEND_API_URL.replace(/\/api\/?$/, "");
          }
          return `${origin}${path}`;
        }
      }
    }
    return trimmed;
  }

  // Relative path from backend (e.g. /uploads/profiles/xyz.jpg)
  if (trimmed.startsWith("/")) {
    // Remove trailing /api if present to get the host origin
    let origin: string;
    try {
      const url = new URL(BACKEND_API_URL);
      origin = url.origin;
    } catch {
      origin = BACKEND_API_URL.replace(/\/api\/?$/, "");
    }
    return `${origin}${trimmed}`;
  }

  // Anything else – return as-is
  return trimmed;
}

export { FALLBACK_IMAGE };


