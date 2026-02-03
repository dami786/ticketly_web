/**
 * Event image URL utilities.
 *
 * Image path/data comes from:
 * - List (home, discover): GET /api/events — each event has imageUrl or image (relative path)
 * - Single event: GET /api/events/:id — same imageUrl / image field
 *
 * There is no separate "images API". Frontend uses getEventImageUrl(event) to build
 * the full URL (API base without /api + path → https://your-backend.com/uploads/events/xyz.jpg)
 * and uses it in <img src={url} />. Browser does a direct GET to that URL; no extra API call.
 *
 * For upload (create/edit event): use POST /api/events/upload-image; response imageUrl
 * is then sent when saving/updating the event.
 */
export {
  getEventImageUrl,
  getProfileImageUrl,
  FALLBACK_IMAGE,
} from "./images";
