"use client";

export function EventCardSkeleton() {
  return (
    <div className="mb-4 w-full animate-pulse rounded-2xl bg-gradient-to-br from-white/5 via-surface to-black/80 shadow-[0_14px_35px_rgba(0,0,0,0.65)] ring-1 ring-white/5">
      <div className="relative h-40 w-full overflow-hidden rounded-t-2xl bg-[#1F2937] sm:h-56">
        {/* Shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      </div>
      <div className="space-y-2 p-3">
        <div className="h-4 w-3/4 rounded bg-[#1F2937]" />
        <div className="h-3 w-1/2 rounded bg-[#1F2937]" />
      </div>
    </div>
  );
}

// Multiple skeletons for list view
export function EventCardSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <EventCardSkeleton key={i} />
      ))}
    </>
  );
}


