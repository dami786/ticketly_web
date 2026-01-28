import Link from "next/link";
import { FiMapPin } from "react-icons/fi";
import type { Event } from "../lib/api/events";

interface EventCardProps {
  event: Event & { id?: string };
  href?: string;
}

export function EventCard({ event, href }: EventCardProps) {
  const id = event._id ?? event.id;
  const url = href ?? (id ? `/events/${id}` : "#");

  const date = new Date(event.date);
  const month = date.toLocaleString("default", { month: "short" });
  const day = date.getDate();

  // Get image source - handle base64, URLs, and missing images
  const getImageSrc = () => {
    // Check multiple possible field names for image
    const img = (event as any).image || 
                (event as any).imageUrl || 
                (event as any).image_url ||
                "";
    
    // Debug log
    if (process.env.NODE_ENV === "development") {
      console.log(`EventCard - ${event.title}:`, {
        hasImage: !!(event as any).image,
        hasImageUrl: !!(event as any).imageUrl,
        imageValue: img ? `${img.substring(0, 50)}...` : "no image",
        imageLength: img?.length || 0
      });
    }
    
    // Check if image exists and is valid
    if (!img || 
        img.trim() === "" || 
        img === "null" || 
        img === "undefined" ||
        img === null ||
        img === undefined) {
      return "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800";
    }
    
    // Return image as-is (base64 or URL)
    return img;
  };

  const imageSrc = getImageSrc();
  const isBase64 = imageSrc.startsWith("data:");

  return (
    <Link
      href={url}
      className="mb-4 w-full rounded-2xl bg-gradient-to-br from-white/5 via-surface to-black/80 text-left shadow-[0_14px_35px_rgba(0,0,0,0.65)] ring-1 ring-white/5 backdrop-blur-sm transition hover:-translate-y-1 hover:shadow-[0_20px_45px_rgba(0,0,0,0.8)]"
    >
      <div className="relative h-40 w-full overflow-hidden rounded-t-2xl bg-[#111827] sm:h-56">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt={event.title || "Event"}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            // Fallback to default image if error
            const target = e.target as HTMLImageElement;
            if (!target.src.includes("unsplash.com")) {
              target.src = "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800";
            }
          }}
        />
        {/* subtle top glass overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 via-black/20 to-transparent" />
        <div className="absolute right-2 top-2 min-w-[50px] rounded-lg bg-danger px-2.5 py-1.5 text-center">
          <div className="text-[10px] font-semibold uppercase text-white">
            {month}
          </div>
          <div className="text-base font-bold text-white">{day}</div>
        </div>
      </div>
      <div className="space-y-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold text-white sm:text-base">
          {event.title}
        </h3>
        <div className="flex items-center text-xs text-mutedLight">
          <span className="mr-1 text-accent">
            <FiMapPin size={12} />
          </span>
          <span className="line-clamp-1">
            {event.location?.length > 40
              ? `${event.location.slice(0, 40)}…`
              : event.location}
          </span>
        </div>
      </div>
    </Link>
  );
}

