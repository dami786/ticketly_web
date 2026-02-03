"use client";

/**
 * EventCardSkeleton – list/home/profile placeholder.
 * Used on: Home, Event Filter, Profile (mobile + desktop responsive).
 * Rose theme: #FFF1F2 card, #FFE4E6 image/lines, #FECDD3 pill inner, rgba(220,38,38,0.12) pill.
 * Pulse: 0.35 → 0.65, 1.6s ease-in-out infinite.
 */
export function EventCardSkeleton() {
  return (
    <div className="w-full rounded-lg overflow-hidden bg-[#FFF1F2]">
      {/* Image block: 150px height */}
      <div
        className="relative w-full h-[150px] bg-[#FFE4E6] skeleton-pulse"
        style={{ minHeight: "150px" }}
      >
        {/* Price pill overlay: 28px from bottom of image, left 12px */}
        <div
          className="absolute left-3 bottom-7 rounded-full px-2 py-1.5 flex items-center justify-center"
          style={{
            backgroundColor: "rgba(220, 38, 38, 0.12)",
          }}
        >
          <div className="w-9 h-3 rounded bg-[#FECDD3] skeleton-pulse" />
        </div>
      </div>

      {/* Content: padding 12px */}
      <div className="p-3">
        {/* Short line 55% */}
        <div className="h-2.5 w-[55%] rounded bg-[#FFE4E6] skeleton-pulse mb-2" />
        {/* Title line 1: 95% */}
        <div className="h-3 w-[95%] rounded bg-[#FFE4E6] skeleton-pulse mb-1.5" />
        {/* Title line 2: 70% */}
        <div className="h-3 w-[70%] rounded bg-[#FFE4E6] skeleton-pulse mb-2.5" />
        {/* Avatar + host line */}
        <div className="flex items-center">
          <div className="w-5 h-5 rounded-full bg-[#FFE4E6] skeleton-pulse mr-2 flex-shrink-0" />
          <div className="h-2.5 w-[60px] rounded bg-[#FFE4E6] skeleton-pulse" />
        </div>
      </div>
    </div>
  );
}

export function EventCardSkeletonList({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={`skeleton-${i}`} />
      ))}
    </>
  );
}
