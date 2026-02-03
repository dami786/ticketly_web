"use client";

export function EventCardSkeleton() {
  return (
    <div className="w-full rounded-xl overflow-hidden border border-gray-200 bg-white">
      {/* Image */}
      <div className="w-full aspect-[16/9] bg-[#FFF1F2] animate-skeleton-pulse" />
      
      {/* Content */}
      <div className="p-3">
        {/* Price Badge */}
        <div className="mb-2">
          <div className="inline-block h-5 w-12 rounded bg-[#FFE4E6] animate-skeleton-pulse" />
        </div>
        
        {/* Date */}
        <div className="mb-2">
          <div className="h-4 w-24 rounded bg-[rgba(220,38,38,0.12)] animate-skeleton-pulse" />
        </div>
        
        {/* Title */}
        <div className="mb-2">
          <div className="h-5 w-full rounded bg-[#FECDD3] animate-skeleton-pulse" />
          <div className="h-5 w-3/4 rounded bg-[#FECDD3] animate-skeleton-pulse mt-1" />
        </div>
        
        {/* Host */}
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-[#FFE4E6] animate-skeleton-pulse" />
          <div className="h-4 w-20 rounded bg-[rgba(220,38,38,0.12)] animate-skeleton-pulse" />
        </div>
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

